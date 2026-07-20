import { Injectable } from '@nestjs/common';
import {
  IngredientCategory,
  Prisma,
  ReviewKind,
  ReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, ErrorCodes } from '../common/errors';
import type { ParsedRecipe } from '../ai/parse/parse-recipe-json';
import { persistOneAiRecipe } from '../recipe/persist-ai-recipe';

@Injectable()
export class KnowledgeReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async listPending(kind?: ReviewKind) {
    const rows = await this.prisma.knowledgeReview.findMany({
      where: {
        status: ReviewStatus.PENDING,
        ...(kind ? { kind } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      status: row.status,
      payload: row.payload,
      createdAt: row.createdAt,
    }));
  }

  async approve(id: string, reviewerId?: string) {
    const review = await this.prisma.knowledgeReview.findUnique({
      where: { id },
    });
    if (!review) {
      throw new AppError(ErrorCodes.INVALID_PARAM, 'Review not found', 404);
    }
    if (review.status !== ReviewStatus.PENDING) {
      throw new AppError(
        ErrorCodes.INVALID_PARAM,
        `Review already ${review.status.toLowerCase()}`,
        400,
      );
    }

    if (review.kind === ReviewKind.RECIPE) {
      const recipeId = await this.materializeRecipe(
        review.payload as Prisma.JsonValue,
      );
      const updated = await this.prisma.knowledgeReview.update({
        where: { id },
        data: {
          status: ReviewStatus.APPROVED,
          decidedAt: new Date(),
          reviewerId: reviewerId ?? null,
        },
      });
      return { review: updated, recipeId };
    }

    if (review.kind === ReviewKind.INGREDIENT) {
      const ingredientId = await this.materializeIngredient(
        review.payload as Prisma.JsonValue,
      );
      const updated = await this.prisma.knowledgeReview.update({
        where: { id },
        data: {
          status: ReviewStatus.APPROVED,
          decidedAt: new Date(),
          reviewerId: reviewerId ?? null,
        },
      });
      return { review: updated, recipeId: ingredientId };
    }

    const updated = await this.prisma.knowledgeReview.update({
      where: { id },
      data: {
        status: ReviewStatus.APPROVED,
        decidedAt: new Date(),
        reviewerId: reviewerId ?? null,
      },
    });
    return { review: updated, recipeId: null };
  }

  async reject(id: string, reviewerId?: string) {
    const review = await this.prisma.knowledgeReview.findUnique({
      where: { id },
    });
    if (!review) {
      throw new AppError(ErrorCodes.INVALID_PARAM, 'Review not found', 404);
    }
    if (review.status !== ReviewStatus.PENDING) {
      throw new AppError(
        ErrorCodes.INVALID_PARAM,
        `Review already ${review.status.toLowerCase()}`,
        400,
      );
    }
    const updated = await this.prisma.knowledgeReview.update({
      where: { id },
      data: {
        status: ReviewStatus.REJECTED,
        decidedAt: new Date(),
        reviewerId: reviewerId ?? null,
      },
    });
    return { review: updated };
  }

  private async materializeRecipe(payload: Prisma.JsonValue): Promise<string> {
    const body = payload as {
      queryHash?: string;
      recipe?: ParsedRecipe;
      ingredients?: string[];
    };
    const recipe = body.recipe;
    if (!recipe?.name || !Array.isArray(recipe.ingredients)) {
      throw new AppError(
        ErrorCodes.INVALID_PARAM,
        'Invalid recipe payload',
        400,
      );
    }

    return this.prisma.$transaction(async (tx) =>
      persistOneAiRecipe(tx, recipe, body.queryHash ?? ''),
    );
  }

  private async materializeIngredient(payload: Prisma.JsonValue): Promise<string> {
    const body = payload as {
      name?: string;
      category?: string;
      taste?: string | null;
      description?: string | null;
    };
    const name = body.name?.trim();
    if (!name) {
      throw new AppError(
        ErrorCodes.INVALID_PARAM,
        'Invalid ingredient payload',
        400,
      );
    }

    const category = Object.values(IngredientCategory).includes(
      body.category as IngredientCategory,
    )
      ? (body.category as IngredientCategory)
      : IngredientCategory.SIDE;

    const row = await this.prisma.ingredient.upsert({
      where: { name },
      create: {
        name,
        category,
        taste: body.taste?.trim() || null,
        description: body.description?.trim() || null,
      },
      update: {
        category,
        taste: body.taste?.trim() || null,
        description: body.description?.trim() || null,
      },
    });
    return row.id;
  }
}

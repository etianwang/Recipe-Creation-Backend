import { Injectable } from '@nestjs/common';
import {
  IngredientCategory,
  KnowledgeSource,
  MaterialType,
  Prisma,
  RecipeSource,
  RecipeStatus,
  ReviewKind,
  ReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, ErrorCodes } from '../common/errors';
import type { ParsedRecipe } from '../ai/parse/parse-recipe-json';

function mapMaterialType(type: string): MaterialType {
  switch (type) {
    case '主料':
      return MaterialType.MAIN;
    case '辅料':
      return MaterialType.SIDE;
    case '调料':
    case '调味料':
      return MaterialType.SEASONING;
    case '香料':
      return MaterialType.SPICE;
    default:
      return MaterialType.OTHER;
  }
}

function guessCategory(type: string): IngredientCategory {
  switch (mapMaterialType(type)) {
    case MaterialType.MAIN:
      return IngredientCategory.MAIN;
    case MaterialType.SIDE:
      return IngredientCategory.SIDE;
    case MaterialType.SEASONING:
      return IngredientCategory.SEASONING;
    case MaterialType.SPICE:
      return IngredientCategory.SPICE;
    default:
      return IngredientCategory.SIDE;
  }
}

@Injectable()
export class KnowledgeReviewService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.$transaction(async (tx) => {
      const ingredientIds: {
        id: string;
        type: MaterialType;
        required: boolean;
      }[] = [];

      for (const item of recipe.ingredients) {
        const name = item.name.trim();
        if (!name) continue;
        const row = await tx.ingredient.upsert({
          where: { name },
          create: {
            name,
            category: guessCategory(item.type),
          },
          update: {},
        });
        ingredientIds.push({
          id: row.id,
          type: mapMaterialType(item.type),
          required: item.required !== false,
        });
      }

      const created = await tx.recipe.create({
        data: {
          name: recipe.name.trim(),
          source: RecipeSource.AI,
          confidence: recipe.confidence,
          status: RecipeStatus.PUBLISHED,
          materials: {
            create: ingredientIds.map((m) => ({
              ingredientId: m.id,
              type: m.type,
              required: m.required,
            })),
          },
        },
      });

      if (Array.isArray(recipe.substitutes)) {
        for (const sub of recipe.substitutes) {
          const from = await tx.ingredient.upsert({
            where: { name: sub.from.trim() },
            create: {
              name: sub.from.trim(),
              category: IngredientCategory.SEASONING,
            },
            update: {},
          });
          for (const to of sub.to) {
            const toRow = await tx.ingredient.upsert({
              where: { name: to.name.trim() },
              create: {
                name: to.name.trim(),
                category: IngredientCategory.SEASONING,
              },
              update: {},
            });
            await tx.ingredientSubstitute.upsert({
              where: {
                ingredientId_substituteId: {
                  ingredientId: from.id,
                  substituteId: toRow.id,
                },
              },
              create: {
                ingredientId: from.id,
                substituteId: toRow.id,
                score: to.score,
                source: KnowledgeSource.AI,
              },
              update: {
                score: to.score,
                source: KnowledgeSource.AI,
              },
            });
          }
        }
      }

      if (body.queryHash) {
        await tx.aiGeneratedRecipe.updateMany({
          where: { queryHash: body.queryHash, linkedRecipeId: null },
          data: { linkedRecipeId: created.id },
        });
      }

      return created.id;
    });
  }
}

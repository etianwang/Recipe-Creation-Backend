import { Injectable } from '@nestjs/common';
import {
  Ingredient,
  IngredientCategory,
  KnowledgeSource,
  Prisma,
  ReviewKind,
  ReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, ErrorCodes } from '../common/errors';
import { categoryLabel, parseCategory } from './ingredient-category';
import {
  CreateIngredientDto,
  UpdateIngredientDto,
} from './dto/ingredient.dto';

export type IngredientView = {
  id: string;
  name: string;
  category: IngredientCategory;
  categoryLabel: string;
  taste: string | null;
  description: string | null;
  /** MANUAL | AI — AI 为推荐落库自动新建 */
  source: KnowledgeSource;
  createdAt: string;
};

export type IngredientSubmitView = {
  reviewId: string;
  status: 'PENDING';
  name: string;
  category: IngredientCategory;
};

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  private toView(row: Ingredient): IngredientView {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      categoryLabel: categoryLabel(row.category),
      taste: row.taste,
      description: row.description,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async search(q?: string, categoryRaw?: string): Promise<IngredientView[]> {
    const category = parseCategory(categoryRaw);
    if (categoryRaw && !category) {
      throw new AppError(
        ErrorCodes.INVALID_PARAM,
        `Invalid category: ${categoryRaw}`,
        400,
      );
    }

    const where: Prisma.IngredientWhereInput = {};
    if (q?.trim()) {
      where.name = { contains: q.trim() };
    }
    if (category) {
      where.category = category;
    }

    const rows = await this.prisma.ingredient.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 100,
    });
    return rows.map((r) => this.toView(r));
  }

  async findById(id: string): Promise<IngredientView> {
    const row = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!row) {
      throw new AppError(
        ErrorCodes.NOT_FOUND_INGREDIENT,
        'Ingredient not found',
        404,
      );
    }
    return this.toView(row);
  }

  async create(dto: CreateIngredientDto): Promise<IngredientView> {
    const name = dto.name.trim();
    if (!name) {
      throw new AppError(ErrorCodes.INVALID_PARAM, 'name is required', 400);
    }

    try {
      const row = await this.prisma.ingredient.create({
        data: {
          name,
          category: dto.category,
          taste: dto.taste?.trim() || null,
          description: dto.description?.trim() || null,
          source: KnowledgeSource.MANUAL,
        },
      });
      return this.toView(row);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppError(
          ErrorCodes.INVALID_PARAM,
          `Ingredient already exists: ${name}`,
          400,
        );
      }
      throw err;
    }
  }

  async submitForReview(
    dto: CreateIngredientDto,
    submitterId: string,
  ): Promise<IngredientSubmitView> {
    const name = dto.name.trim();
    if (!name) {
      throw new AppError(ErrorCodes.INVALID_PARAM, 'name is required', 400);
    }

    const existing = await this.prisma.ingredient.findUnique({ where: { name } });
    if (existing) {
      throw new AppError(
        ErrorCodes.INVALID_PARAM,
        `Ingredient already exists: ${name}`,
        400,
      );
    }

    const duplicateReview = await this.prisma.knowledgeReview.findMany({
      where: {
        kind: ReviewKind.INGREDIENT,
        status: ReviewStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    for (const row of duplicateReview) {
      const payload = row.payload as Prisma.JsonObject;
      if (String(payload.name ?? '').trim() === name) {
        return {
          reviewId: row.id,
          status: 'PENDING',
          name,
          category: dto.category,
        };
      }
    }

    const review = await this.prisma.knowledgeReview.create({
      data: {
        kind: ReviewKind.INGREDIENT,
        status: ReviewStatus.PENDING,
        payload: {
          name,
          category: dto.category,
          taste: dto.taste?.trim() || null,
          description: dto.description?.trim() || null,
          submittedBy: submitterId,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      reviewId: review.id,
      status: 'PENDING',
      name,
      category: dto.category,
    };
  }

  async update(id: string, dto: UpdateIngredientDto): Promise<IngredientView> {
    await this.findById(id);

    try {
      const row = await this.prisma.ingredient.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(dto.taste !== undefined
            ? { taste: dto.taste.trim() || null }
            : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() || null }
            : {}),
        },
      });
      return this.toView(row);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppError(
          ErrorCodes.INVALID_PARAM,
          'Ingredient name already exists',
          400,
        );
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    try {
      await this.prisma.ingredient.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new AppError(
          ErrorCodes.INVALID_PARAM,
          'Ingredient is referenced by recipes or substitutes',
          400,
        );
      }
      throw err;
    }
  }
}

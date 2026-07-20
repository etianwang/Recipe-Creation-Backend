import { KnowledgeSource } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, ErrorCodes } from '../common/errors';
import { resolveIngredientByName } from './ingredient-resolve';

export type SubstituteView = {
  id: string;
  name: string;
  score: number;
  /** manual | ai — 供前端逻辑判断 */
  source: string;
  /** 展示用中文标签 */
  sourceLabel: string;
};

export type SubstituteLookupResult = {
  query: string;
  ingredient: { id: string; name: string };
  /** 有别名/模糊匹配时，为用户输入的原文 */
  resolvedFrom?: string;
  items: SubstituteView[];
};

@Injectable()
export class SubstitutesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByIngredientId(ingredientId: string): Promise<SubstituteView[]> {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });
    if (!ingredient) {
      throw new AppError(
        ErrorCodes.NOT_FOUND_INGREDIENT,
        '食材不存在',
        404,
      );
    }
    return this.listForIngredient(ingredient.id);
  }

  async listByIngredientName(name: string): Promise<SubstituteLookupResult> {
    const resolved = await resolveIngredientByName(this.prisma, name);
    const items = await this.listForIngredient(resolved.ingredient.id);
    return {
      query: resolved.query,
      ingredient: {
        id: resolved.ingredient.id,
        name: resolved.ingredient.name,
      },
      resolvedFrom: resolved.resolvedFrom,
      items,
    };
  }

  private async listForIngredient(
    ingredientId: string,
  ): Promise<SubstituteView[]> {
    const rows = await this.prisma.ingredientSubstitute.findMany({
      where: { ingredientId },
      include: { substitute: true },
      orderBy: { score: 'desc' },
    });

    return rows.map((row) => ({
      id: row.substitute.id,
      name: row.substitute.name,
      score: row.score,
      source: row.source.toLowerCase(),
      sourceLabel:
        row.source === KnowledgeSource.AI ? 'AI推荐' : '菜谱库',
    }));
  }
}

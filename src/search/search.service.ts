import { Injectable } from '@nestjs/common';
import { MaterialType, RecipeSource, RecipeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, ErrorCodes } from '../common/errors';
import { computeQueryHash, normalizeIngredientNames } from './query-hash';
import { RECOMMEND_TOP_N } from '../recipe/recommend.types';

export type DatabaseRecommendHit = {
  id: string;
  name: string;
  score: number;
  missing: string[];
  recipeSource: RecipeSource;
  materials: {
    required: boolean;
    type: MaterialType;
    ingredient: { name: string };
  }[];
};

export type DatabaseRecommendResult = {
  queryHash: string;
  normalizedIngredients: string[];
  items: DatabaseRecommendHit[];
  source: 'database';
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pure DB recommendation (no AI). Scores published recipes by required-material coverage.
   */
  async recommendFromDatabase(
    ingredientNames: string[],
    limit = RECOMMEND_TOP_N,
  ): Promise<DatabaseRecommendResult> {
    const normalizedIngredients = normalizeIngredientNames(ingredientNames);
    if (normalizedIngredients.length === 0) {
      throw new AppError(
        ErrorCodes.EMPTY_INGREDIENTS,
        'ingredients must not be empty',
        400,
      );
    }

    const queryHash = computeQueryHash(normalizedIngredients);
    const userSet = new Set(normalizedIngredients);

    const recipes = await this.prisma.recipe.findMany({
      where: { status: RecipeStatus.PUBLISHED },
      include: {
        materials: {
          include: { ingredient: true },
        },
      },
    });

    const scored: DatabaseRecommendHit[] = [];

    for (const recipe of recipes) {
      if (recipe.materials.length === 0) continue;

      // 匹配度：你拥有的该菜材料数 / 该菜全部材料数（主料+辅料+调料+香料都计入）
      // 避免「仅一个主料命中就 100%」
      const pool = recipe.materials;
      const matchedPool = pool.filter((m) => userSet.has(m.ingredient.name));
      if (matchedPool.length === 0) continue;

      const missing = pool
        .filter((m) => !userSet.has(m.ingredient.name))
        .map((m) => m.ingredient.name);

      const coverage = matchedPool.length / pool.length;
      // 用户已选食材有多少被这道菜用到（未用到的拉低一点分，避免「沾边就满分」）
      const usedByRecipe = normalizedIngredients.filter((n) =>
        pool.some((m) => m.ingredient.name === n),
      ).length;
      const userFit =
        normalizedIngredients.length > 0
          ? usedByRecipe / normalizedIngredients.length
          : 1;
      const score = Math.min(
        100,
        Math.round((coverage * 0.75 + userFit * 0.25) * 10000) / 100,
      );

      scored.push({
        id: recipe.id,
        name: recipe.name,
        score,
        missing,
        recipeSource: recipe.source,
        materials: recipe.materials.map((m) => ({
          required: m.required,
          type: m.type,
          ingredient: { name: m.ingredient.name },
        })),
      });
    }

    scored.sort(
      (a, b) =>
        b.score - a.score ||
        (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
    );

    return {
      queryHash,
      normalizedIngredients,
      items: scored.slice(0, limit),
      source: 'database',
    };
  }
}

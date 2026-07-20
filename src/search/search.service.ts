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

      const required = recipe.materials.filter((m) => m.required);
      const optional = recipe.materials.filter((m) => !m.required);

      const pool = required.length > 0 ? required : recipe.materials;
      const matchedPool = pool.filter((m) => userSet.has(m.ingredient.name));
      if (matchedPool.length === 0) continue;

      const missingRequired = required
        .filter((m) => !userSet.has(m.ingredient.name))
        .map((m) => m.ingredient.name);

      let score: number;
      if (required.length === 0) {
        score = (matchedPool.length / pool.length) * 100;
      } else {
        const coverage = matchedPool.length / required.length;
        const optionalHits = optional.filter((m) =>
          userSet.has(m.ingredient.name),
        ).length;
        const optionalBonus = Math.min(5, optionalHits);
        score = Math.min(100, coverage * 100 + optionalBonus);
      }

      scored.push({
        id: recipe.id,
        name: recipe.name,
        score: Math.round(score * 100) / 100,
        missing: missingRequired,
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

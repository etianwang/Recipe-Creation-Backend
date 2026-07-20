import { Injectable } from '@nestjs/common';
import { KnowledgeSource, RecipeSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PurgeAiOptions = {
  /** Delete recipes with source=AI (default true) */
  recipes?: boolean;
  /** Clear ai_query_cache + ai_query_logs + ai_generated_recipes (default true) */
  cache?: boolean;
  /** Delete AI substitute edges (default true) */
  substitutes?: boolean;
  /** Delete AI ingredients no longer used by any recipe (default true) */
  orphanIngredients?: boolean;
};

export type PurgeAiResult = {
  recipesDeleted: number;
  cacheDeleted: number;
  logsDeleted: number;
  generatedDeleted: number;
  substitutesDeleted: number;
  orphanIngredientsDeleted: number;
};

@Injectable()
export class PurgeAiService {
  constructor(private readonly prisma: PrismaService) {}

  async purge(options: PurgeAiOptions = {}): Promise<PurgeAiResult> {
    const recipes = options.recipes !== false;
    const cache = options.cache !== false;
    const substitutes = options.substitutes !== false;
    const orphanIngredients = options.orphanIngredients !== false;

    let recipesDeleted = 0;
    let cacheDeleted = 0;
    let logsDeleted = 0;
    let generatedDeleted = 0;
    let substitutesDeleted = 0;
    let orphanIngredientsDeleted = 0;

    if (cache) {
      const [gen, cacheRows, logs] = await Promise.all([
        this.prisma.aiGeneratedRecipe.deleteMany({}),
        this.prisma.aiQueryCache.deleteMany({}),
        this.prisma.aiQueryLog.deleteMany({}),
      ]);
      generatedDeleted = gen.count;
      cacheDeleted = cacheRows.count;
      logsDeleted = logs.count;
    }

    if (recipes) {
      const deleted = await this.prisma.recipe.deleteMany({
        where: { source: RecipeSource.AI },
      });
      recipesDeleted = deleted.count;
    }

    if (substitutes) {
      const deleted = await this.prisma.ingredientSubstitute.deleteMany({
        where: { source: KnowledgeSource.AI },
      });
      substitutesDeleted = deleted.count;
    }

    if (orphanIngredients) {
      const orphans = await this.prisma.ingredient.findMany({
        where: {
          source: KnowledgeSource.AI,
          recipeMaterials: { none: {} },
          substitutesFrom: { none: {} },
          substitutesTo: { none: {} },
        },
        select: { id: true },
      });
      if (orphans.length) {
        const deleted = await this.prisma.ingredient.deleteMany({
          where: { id: { in: orphans.map((o) => o.id) } },
        });
        orphanIngredientsDeleted = deleted.count;
      }
    }

    return {
      recipesDeleted,
      cacheDeleted,
      logsDeleted,
      generatedDeleted,
      substitutesDeleted,
      orphanIngredientsDeleted,
    };
  }
}

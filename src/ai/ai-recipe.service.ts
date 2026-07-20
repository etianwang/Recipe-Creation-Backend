import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { computeQueryHash, normalizeIngredientNames } from '../search/query-hash';
import { persistAiRecipes } from '../recipe/persist-ai-recipe';
import { AiClientService } from './ai-client.service';
import {
  buildRecipeSystemPrompt,
  buildRecipeUserPrompt,
} from './prompt/recipe-prompt';
import { parseRecipePayload, ParsedRecipe } from './parse/parse-recipe-json';
import { AppError, ErrorCodes } from '../common/errors';

export type AiRecipePipelineResult = {
  queryHash: string;
  normalizedIngredients: string[];
  recipes: ParsedRecipe[];
  /** @deprecated use recipes[0] */
  recipe: ParsedRecipe;
  source: 'cache' | 'ai';
  rawContent?: string;
};

@Injectable()
export class AiRecipeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
  ) {}

  /** Read ai_query_cache only — never calls the LLM. */
  async loadFromCacheOnly(
    ingredientNames: string[],
  ): Promise<AiRecipePipelineResult | null> {
    const normalizedIngredients = normalizeIngredientNames(ingredientNames);
    if (normalizedIngredients.length === 0) {
      return null;
    }

    const queryHash = computeQueryHash(normalizedIngredients);
    const cached = await this.prisma.aiQueryCache.findUnique({
      where: { queryHash },
    });
    if (!cached) {
      return null;
    }

    const recipes = parseRecipePayload(cached.response);
    return {
      queryHash,
      normalizedIngredients,
      recipes,
      recipe: recipes[0],
      source: 'cache',
    };
  }

  /** 将 AI/cache 菜谱写入正式库，便于下次纯库内推荐。 */
  async ensurePersisted(
    queryHash: string,
    recipes: ParsedRecipe[],
  ): Promise<void> {
    if (recipes.length === 0) return;
    await persistAiRecipes(this.prisma, queryHash, recipes);
  }

  /** 按 recipeId 取 AI 原始步骤与用量（库内 AI 菜谱展示用） */
  async getParsedDetailsByRecipeIds(
    recipeIds: string[],
  ): Promise<Map<string, ParsedRecipe>> {
    if (recipeIds.length === 0) return new Map();

    const rows = await this.prisma.aiGeneratedRecipe.findMany({
      where: { linkedRecipeId: { in: recipeIds } },
      orderBy: { createdAt: 'desc' },
    });

    const map = new Map<string, ParsedRecipe>();
    for (const row of rows) {
      if (!row.linkedRecipeId || map.has(row.linkedRecipeId)) continue;
      const payload = row.payload as { recipe?: ParsedRecipe };
      if (payload?.recipe?.name) {
        map.set(row.linkedRecipeId, payload.recipe);
      }
    }
    return map;
  }

  async generateOrLoad(
    ingredientNames: string[],
    options?: { recipeCount?: number; skipCache?: boolean },
  ): Promise<AiRecipePipelineResult> {
    const normalizedIngredients = normalizeIngredientNames(ingredientNames);
    if (normalizedIngredients.length === 0) {
      throw new AppError(
        ErrorCodes.EMPTY_INGREDIENTS,
        'ingredients must not be empty',
        400,
      );
    }

    const queryHash = computeQueryHash(normalizedIngredients);
    const cachedHit = options?.skipCache
      ? null
      : await this.loadFromCacheOnly(ingredientNames);
    if (cachedHit) {
      await this.ensurePersisted(queryHash, cachedHit.recipes);
      return cachedHit;
    }

    const system = buildRecipeSystemPrompt();
    const user = buildRecipeUserPrompt(
      normalizedIngredients,
      options?.recipeCount ?? 1,
    );
    const completion = await this.aiClient.complete(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { jsonMode: true },
    );

    let recipes: ParsedRecipe[];
    let parsedOk = true;
    try {
      recipes = parseRecipePayload(completion.content);
    } catch {
      parsedOk = false;
      await this.prisma.aiQueryLog.create({
        data: {
          queryHash,
          input: normalizedIngredients,
          prompt: `${system}\n\n${user}`,
          rawResponse: completion.content,
          parsedOk: false,
        },
      });
      throw new AppError(
        ErrorCodes.AI_INVALID_JSON,
        'AI output is not valid JSON',
        502,
      );
    }

    await this.prisma.$transaction([
      this.prisma.aiQueryLog.create({
        data: {
          queryHash,
          input: normalizedIngredients,
          prompt: `${system}\n\n${user}`,
          rawResponse: completion.content,
          parsedOk,
        },
      }),
      this.prisma.aiQueryCache.upsert({
        where: { queryHash },
        create: {
          queryHash,
          input: normalizedIngredients,
          response: { recipes } as unknown as Prisma.InputJsonValue,
        },
        update: {
          input: normalizedIngredients,
          response: { recipes } as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    await this.ensurePersisted(queryHash, recipes);

    return {
      queryHash,
      normalizedIngredients,
      recipes,
      recipe: recipes[0],
      source: 'ai',
      rawContent: completion.content,
    };
  }
}

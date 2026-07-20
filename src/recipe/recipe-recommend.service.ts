import { Injectable, Logger } from '@nestjs/common';
import { RecipeSource } from '@prisma/client';
import { SearchService } from '../search/search.service';
import { AiRecipeService } from '../ai/ai-recipe.service';
import { buildDbRecipeDetail } from './recipe-detail';
import { buildDetailFromParsed } from './recipe-detail-parsed';
import {
  computeQueryHash,
  normalizeIngredientNames,
} from '../search/query-hash';
import {
  RECOMMEND_DB_QUALIFY_SCORE,
  RECOMMEND_DB_SCAN_LIMIT,
  RECOMMEND_TOP_N,
  RecommendItem,
  RecommendResponse,
} from './recommend.types';
import type { ParsedRecipe } from '../ai/parse/parse-recipe-json';
import type { DatabaseRecommendHit } from '../search/search.service';

function mapDbItems(
  hits: DatabaseRecommendHit[],
  aiDetails: Map<string, ParsedRecipe>,
): RecommendItem[] {
  return hits.map((hit) => {
    const parsed = aiDetails.get(hit.id);
    const { ingredients, steps } = parsed
      ? buildDetailFromParsed(parsed)
      : buildDbRecipeDetail(hit.name, hit.materials);
    const isAi = hit.recipeSource === RecipeSource.AI;
    return {
      recipeId: hit.id,
      recipe: hit.name,
      score: hit.score,
      missing: hit.missing,
      source: isAi ? 'ai' : 'database',
      isAiSuggestion: isAi,
      sourceLabel: isAi ? 'AI推荐' : '菜谱库',
      ingredients,
      steps,
    };
  });
}

export type RecommendOptions = {
  /** 不调用大模型（轮询/只读刷新） */
  skipLiveAi?: boolean;
  /** callContainer 15s 限制：后台调 AI，先返回部分结果 */
  asyncLiveAi?: boolean;
};

@Injectable()
export class RecipeRecommendService {
  private readonly logger = new Logger(RecipeRecommendService.name);
  private readonly liveAiInFlight = new Set<string>();

  constructor(
    private readonly searchService: SearchService,
    private readonly aiRecipeService: AiRecipeService,
  ) {}

  private async buildItemsFromDb(
    hits: DatabaseRecommendHit[],
  ): Promise<RecommendItem[]> {
    const aiIds = hits
      .filter((h) => h.recipeSource === RecipeSource.AI)
      .map((h) => h.id);
    const aiDetails =
      await this.aiRecipeService.getParsedDetailsByRecipeIds(aiIds);
    return mapDbItems(hits, aiDetails);
  }

  isLiveAiInFlight(queryHash: string): boolean {
    return this.liveAiInFlight.has(queryHash);
  }

  private scheduleLiveAi(ingredientNames: string[]): void {
    const normalized = normalizeIngredientNames(ingredientNames);
    if (normalized.length === 0) return;

    const queryHash = computeQueryHash(normalized);
    if (this.liveAiInFlight.has(queryHash)) return;

    this.liveAiInFlight.add(queryHash);
    const want = RECOMMEND_TOP_N;
    void this.aiRecipeService
      .generateOrLoad(ingredientNames, { recipeCount: want })
      .catch((err) => {
        this.logger.warn(
          `background live AI failed: ${err instanceof Error ? err.message : err}`,
        );
      })
      .finally(() => {
        this.liveAiInFlight.delete(queryHash);
      });
  }

  async recommend(
    ingredientNames: string[],
    options?: RecommendOptions,
  ): Promise<RecommendResponse> {
    let db = await this.searchService.recommendFromDatabase(
      ingredientNames,
      RECOMMEND_DB_SCAN_LIMIT,
    );

    let qualified = db.items.filter(
      (hit) => hit.score > RECOMMEND_DB_QUALIFY_SCORE,
    );
    let items = await this.buildItemsFromDb(qualified);

    let aiSource: 'cache' | 'ai' | null = null;
    const needAi = items.length < RECOMMEND_TOP_N;
    const skipLiveAi =
      options?.skipLiveAi === true || process.env.RECOMMEND_LIVE_AI === '0';
    const asyncLiveAi = options?.asyncLiveAi === true;

    if (needAi) {
      const cached =
        await this.aiRecipeService.loadFromCacheOnly(ingredientNames);
      if (cached) {
        aiSource = 'cache';
        await this.aiRecipeService.ensurePersisted(
          cached.queryHash,
          cached.recipes,
        );
        db = await this.searchService.recommendFromDatabase(
          ingredientNames,
          RECOMMEND_DB_SCAN_LIMIT,
        );
        qualified = db.items.filter(
          (hit) => hit.score > RECOMMEND_DB_QUALIFY_SCORE,
        );
        items = await this.buildItemsFromDb(qualified);
      }

      if (items.length < RECOMMEND_TOP_N && !skipLiveAi) {
        if (asyncLiveAi) {
          this.scheduleLiveAi(ingredientNames);
          items = items.slice(0, RECOMMEND_TOP_N);
          return {
            queryHash: db.queryHash,
            normalizedIngredients: db.normalizedIngredients,
            items,
            source: aiSource ?? 'database',
            aiPending: true,
          };
        }

        const want = RECOMMEND_TOP_N - items.length;
        try {
          const ai = await this.aiRecipeService.generateOrLoad(
            ingredientNames,
            { recipeCount: want },
          );
          aiSource = ai.source;
          db = await this.searchService.recommendFromDatabase(
            ingredientNames,
            RECOMMEND_DB_SCAN_LIMIT,
          );
          qualified = db.items.filter(
            (hit) => hit.score > RECOMMEND_DB_QUALIFY_SCORE,
          );
          items = await this.buildItemsFromDb(qualified);
        } catch (err) {
          this.logger.warn(
            `live AI supplement failed: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }

    items = items.slice(0, RECOMMEND_TOP_N);

    const source: RecommendResponse['source'] = !aiSource
      ? 'database'
      : items.some((i) => i.source === 'database')
        ? 'mixed'
        : aiSource;

    return {
      queryHash: db.queryHash,
      normalizedIngredients: db.normalizedIngredients,
      items,
      source,
      aiPending: false,
    };
  }

  /** 轮询：只读库+缓存；若后台 AI 已完成则返回完整列表 */
  async pollRecommend(ingredientNames: string[]): Promise<RecommendResponse> {
    const result = await this.recommend(ingredientNames, { skipLiveAi: true });
    const stillNeed = result.items.length < RECOMMEND_TOP_N;
    if (!stillNeed) {
      return { ...result, aiPending: false };
    }

    const cached =
      await this.aiRecipeService.loadFromCacheOnly(ingredientNames);
    if (cached) {
      const refreshed = await this.recommend(ingredientNames, {
        skipLiveAi: true,
      });
      return { ...refreshed, aiPending: false };
    }

    if (this.isLiveAiInFlight(result.queryHash)) {
      return { ...result, aiPending: true };
    }

    return { ...result, aiPending: false };
  }
}

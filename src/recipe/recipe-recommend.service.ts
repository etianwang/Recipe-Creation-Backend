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

  private async loadQualifiedItems(
    ingredientNames: string[],
  ): Promise<{
    db: Awaited<ReturnType<SearchService['recommendFromDatabase']>>;
    items: RecommendItem[];
  }> {
    const db = await this.searchService.recommendFromDatabase(
      ingredientNames,
      RECOMMEND_DB_SCAN_LIMIT,
    );
    const qualified = db.items.filter(
      (hit) => hit.score > RECOMMEND_DB_QUALIFY_SCORE,
    );
    const items = await this.buildItemsFromDb(qualified);
    return { db, items };
  }

  isLiveAiInFlight(queryHash: string): boolean {
    return this.liveAiInFlight.has(queryHash);
  }

  private scheduleLiveAi(
    ingredientNames: string[],
    options?: { skipCache?: boolean },
  ): void {
    const normalized = normalizeIngredientNames(ingredientNames);
    if (normalized.length === 0) return;

    const queryHash = computeQueryHash(normalized);
    if (this.liveAiInFlight.has(queryHash)) return;

    this.liveAiInFlight.add(queryHash);
    const want = RECOMMEND_TOP_N;
    void this.aiRecipeService
      .generateOrLoad(ingredientNames, {
        recipeCount: want,
        skipCache: options?.skipCache,
      })
      .catch((err) => {
        this.logger.warn(
          `background live AI failed: ${err instanceof Error ? err.message : err}`,
        );
      })
      .finally(() => {
        this.liveAiInFlight.delete(queryHash);
      });
  }

  private async applyAiCache(
    ingredientNames: string[],
  ): Promise<'hit' | 'miss'> {
    const cached =
      await this.aiRecipeService.loadFromCacheOnly(ingredientNames);
    if (!cached) return 'miss';

    await this.aiRecipeService.ensurePersisted(
      cached.queryHash,
      cached.recipes,
    );
    return 'hit';
  }

  private buildResponse(
    db: Awaited<ReturnType<SearchService['recommendFromDatabase']>>,
    items: RecommendItem[],
    aiSource: 'cache' | 'ai' | null,
    aiPending: boolean,
  ): RecommendResponse {
    const sliced = items.slice(0, RECOMMEND_TOP_N);
    const source: RecommendResponse['source'] = !aiSource
      ? 'database'
      : sliced.some((i) => i.source === 'database')
        ? 'mixed'
        : aiSource;

    return {
      queryHash: db.queryHash,
      normalizedIngredients: db.normalizedIngredients,
      items: sliced,
      source,
      aiPending,
    };
  }

  async recommend(
    ingredientNames: string[],
    options?: RecommendOptions,
  ): Promise<RecommendResponse> {
    let { db, items } = await this.loadQualifiedItems(ingredientNames);

    let aiSource: 'cache' | 'ai' | null = null;
    const skipLiveAi =
      options?.skipLiveAi === true || process.env.RECOMMEND_LIVE_AI === '0';
    const asyncLiveAi = options?.asyncLiveAi === true;

    if (items.length < RECOMMEND_TOP_N) {
      const cacheResult = await this.applyAiCache(ingredientNames);
      if (cacheResult === 'hit') {
        aiSource = 'cache';
        ({ db, items } = await this.loadQualifiedItems(ingredientNames));
      }

      if (items.length < RECOMMEND_TOP_N && !skipLiveAi) {
        const skipCache = cacheResult === 'hit';

        if (asyncLiveAi) {
          this.scheduleLiveAi(ingredientNames, { skipCache });
          return this.buildResponse(db, items, aiSource, true);
        }

        const want = RECOMMEND_TOP_N - items.length;
        try {
          const ai = await this.aiRecipeService.generateOrLoad(
            ingredientNames,
            { recipeCount: want, skipCache },
          );
          aiSource = ai.source;
          ({ db, items } = await this.loadQualifiedItems(ingredientNames));
        } catch (err) {
          this.logger.warn(
            `live AI supplement failed: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }

    return this.buildResponse(db, items, aiSource, false);
  }

  /** 轮询：只读库+缓存；若仍不足则等待或再次触发 live AI */
  async pollRecommend(ingredientNames: string[]): Promise<RecommendResponse> {
    const result = await this.recommend(ingredientNames, { skipLiveAi: true });
    if (result.items.length >= RECOMMEND_TOP_N) {
      return { ...result, aiPending: false };
    }

    if (this.isLiveAiInFlight(result.queryHash)) {
      return { ...result, aiPending: true };
    }

    const cacheResult = await this.applyAiCache(ingredientNames);
    if (cacheResult === 'hit') {
      const refreshed = await this.recommend(ingredientNames, {
        skipLiveAi: true,
      });
      if (refreshed.items.length >= RECOMMEND_TOP_N) {
        return { ...refreshed, aiPending: false };
      }
      if (process.env.RECOMMEND_LIVE_AI !== '0') {
        this.scheduleLiveAi(ingredientNames, { skipCache: true });
        return { ...refreshed, aiPending: true };
      }
      return { ...refreshed, aiPending: false };
    }

    if (process.env.RECOMMEND_LIVE_AI !== '0') {
      this.scheduleLiveAi(ingredientNames);
      return { ...result, aiPending: true };
    }

    return { ...result, aiPending: false };
  }
}

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
  RECOMMEND_AI_GENERATE_COUNT,
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
      fromRecipeLibrary: true,
      sourceLabel: isAi ? 'AI推荐 · 来自菜谱库' : '菜谱库',
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

  private mapCachedRecipesToItems(recipes: ParsedRecipe[]): RecommendItem[] {
    return recipes.map((recipe) => {
      const { ingredients, steps } = buildDetailFromParsed(recipe);
      return {
        recipeId: null,
        recipe: recipe.name,
        score: Math.round((recipe.confidence ?? 0.85) * 100),
        missing: [],
        source: 'ai',
        isAiSuggestion: true,
        fromRecipeLibrary: false,
        sourceLabel: 'AI推荐',
        ingredients,
        steps,
      };
    });
  }

  private mergeRecommendItems(
    dbItems: RecommendItem[],
    extra: RecommendItem[],
  ): RecommendItem[] {
    const seen = new Set(dbItems.map((i) => i.recipe));
    const merged = [...dbItems];
    for (const item of extra) {
      if (seen.has(item.recipe)) continue;
      seen.add(item.recipe);
      merged.push(item);
    }
    return merged.slice(0, RECOMMEND_TOP_N);
  }

  private async itemsWithAiCacheFallback(
    ingredientNames: string[],
    dbItems: RecommendItem[],
  ): Promise<RecommendItem[]> {
    if (dbItems.length >= RECOMMEND_TOP_N) return dbItems;
    const cached =
      await this.aiRecipeService.loadFromCacheOnly(ingredientNames);
    if (!cached?.recipes.length) return dbItems;
    return this.mergeRecommendItems(
      dbItems,
      this.mapCachedRecipesToItems(cached.recipes),
    );
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
    const want = RECOMMEND_AI_GENERATE_COUNT;
    void this.aiRecipeService
      .generateOrLoad(ingredientNames, {
        recipeCount: want,
        skipCache: options?.skipCache,
      })
      .then(() => {
        this.logger.log(`background live AI done queryHash=${queryHash}`);
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
      ingredientNames,
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
        items = await this.itemsWithAiCacheFallback(ingredientNames, items);
        // 同组合已有 AI 缓存：只复用沉淀结果，不再调 live AI（TR-REC-004 二次命中）
        return this.buildResponse(db, items, aiSource, false);
      }

      if (!skipLiveAi) {
        if (asyncLiveAi) {
          this.scheduleLiveAi(ingredientNames);
          return this.buildResponse(db, items, aiSource, true);
        }

        const want = Math.max(
          RECOMMEND_AI_GENERATE_COUNT,
          RECOMMEND_TOP_N - items.length,
        );
        try {
          const ai = await this.aiRecipeService.generateOrLoad(
            ingredientNames,
            { recipeCount: want },
          );
          aiSource = ai.source;
          ({ db, items } = await this.loadQualifiedItems(ingredientNames));
          items = await this.itemsWithAiCacheFallback(ingredientNames, items);
        } catch (err) {
          this.logger.warn(
            `live AI supplement failed: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }

    return this.buildResponse(db, items, aiSource, false);
  }

  /** 轮询：只读库+缓存；仅在无缓存且不足时触发 live AI */
  async pollRecommend(ingredientNames: string[]): Promise<RecommendResponse> {
    const result = await this.recommend(ingredientNames, { skipLiveAi: true });
    let items = await this.itemsWithAiCacheFallback(
      ingredientNames,
      result.items,
    );
    if (items.length >= RECOMMEND_TOP_N) {
      return { ...result, items, source: 'mixed', aiPending: false };
    }

    if (this.isLiveAiInFlight(result.queryHash)) {
      return { ...result, items, aiPending: true };
    }

    const cached =
      await this.aiRecipeService.loadFromCacheOnly(ingredientNames);
    if (cached) {
      await this.aiRecipeService.ensurePersisted(
        cached.queryHash,
        cached.recipes,
        ingredientNames,
      );
      const refreshed = await this.recommend(ingredientNames, {
        skipLiveAi: true,
      });
      items = await this.itemsWithAiCacheFallback(
        ingredientNames,
        refreshed.items,
      );
      // 已有缓存：不再 skipCache 重调 AI
      return {
        ...refreshed,
        items,
        source: items.some((i) => !i.isAiSuggestion) &&
          items.some((i) => i.isAiSuggestion)
          ? 'mixed'
          : items.some((i) => i.isAiSuggestion)
            ? 'ai'
            : 'database',
        aiPending: false,
      };
    }

    if (process.env.RECOMMEND_LIVE_AI !== '0') {
      this.scheduleLiveAi(ingredientNames);
      return { ...result, items, aiPending: true };
    }

    return { ...result, items, aiPending: false };
  }
}

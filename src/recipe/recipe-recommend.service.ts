import { Injectable, Logger } from '@nestjs/common';
import { RecipeSource } from '@prisma/client';
import { SearchService } from '../search/search.service';
import { AiRecipeService } from '../ai/ai-recipe.service';
import { buildDbRecipeDetail } from './recipe-detail';
import { buildDetailFromParsed } from './recipe-detail-parsed';
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

@Injectable()
export class RecipeRecommendService {
  private readonly logger = new Logger(RecipeRecommendService.name);

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

  async recommend(ingredientNames: string[]): Promise<RecommendResponse> {
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

      if (items.length < RECOMMEND_TOP_N) {
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
    };
  }
}

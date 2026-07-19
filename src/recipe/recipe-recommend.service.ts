import { Injectable } from '@nestjs/common';
import { SearchService } from '../search/search.service';
import { AiRecipeService } from '../ai/ai-recipe.service';

export type RecommendResponse = {
  queryHash: string;
  normalizedIngredients: string[];
  recipe: { id: string; name: string } | null;
  score: number;
  missing: string[];
  source: 'database' | 'cache' | 'ai';
};

@Injectable()
export class RecipeRecommendService {
  constructor(
    private readonly searchService: SearchService,
    private readonly aiRecipeService: AiRecipeService,
  ) {}

  async recommend(ingredientNames: string[]): Promise<RecommendResponse> {
    const db = await this.searchService.recommendFromDatabase(ingredientNames);
    if (db.recipe && db.score >= 50) {
      return db;
    }

    const ai = await this.aiRecipeService.generateOrLoad(ingredientNames);
    const userSet = new Set(ai.normalizedIngredients);
    const missing = ai.recipe.ingredients
      .filter((i) => i.required && !userSet.has(i.name))
      .map((i) => i.name);

    return {
      queryHash: ai.queryHash,
      normalizedIngredients: ai.normalizedIngredients,
      recipe: { id: '', name: ai.recipe.name },
      score: Math.round(ai.recipe.confidence * 10000) / 100,
      missing,
      source: ai.source === 'cache' ? 'cache' : 'ai',
    };
  }
}

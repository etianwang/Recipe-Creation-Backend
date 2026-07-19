import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { RecommendRecipeDto } from './dto/recommend-recipe.dto';
import { RecipeRecommendService } from './recipe-recommend.service';

@Controller('recipe')
export class RecipeController {
  constructor(private readonly recommendService: RecipeRecommendService) {}

  @Post('recommend')
  @HttpCode(200)
  async recommend(@Body() dto: RecommendRecipeDto) {
    const result = await this.recommendService.recommend(dto.ingredients);

    return {
      code: 0,
      message: 'ok',
      data: {
        recipe: result.recipe?.name ?? null,
        recipeId: result.recipe?.id ? result.recipe.id : null,
        score: result.score,
        missing: result.missing,
        source: result.source,
        queryHash: result.queryHash,
        normalizedIngredients: result.normalizedIngredients,
      },
    };
  }
}

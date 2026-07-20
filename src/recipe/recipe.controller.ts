import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { RecommendRecipeDto } from './dto/recommend-recipe.dto';
import { RecipeRecommendService } from './recipe-recommend.service';
import { RecipeFavoritesService } from './recipe-favorites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayloadUser } from '../auth/jwt-payload';

@Controller('recipe')
export class RecipeController {
  constructor(
    private readonly recommendService: RecipeRecommendService,
    private readonly favoritesService: RecipeFavoritesService,
  ) {}

  @Post('recommend')
  @HttpCode(200)
  async recommend(@Body() dto: RecommendRecipeDto) {
    const result = await this.recommendService.recommend(dto.ingredients);
    const top = result.items[0];

    return {
      code: 0,
      message: 'ok',
      data: {
        items: result.items,
        recipe: top?.recipe ?? null,
        recipeId: top?.recipeId ?? null,
        score: top?.score ?? 0,
        missing: top?.missing ?? [],
        source: result.source,
        queryHash: result.queryHash,
        normalizedIngredients: result.normalizedIngredients,
      },
    };
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  async listFavorites(@Req() req: { user: JwtPayloadUser }) {
    const data = await this.favoritesService.list(req.user.sub);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async addFavorite(
    @Param('id') id: string,
    @Req() req: { user: JwtPayloadUser },
  ) {
    const data = await this.favoritesService.add(req.user.sub, id);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard)
  async removeFavorite(
    @Param('id') id: string,
    @Req() req: { user: JwtPayloadUser },
  ) {
    const data = await this.favoritesService.remove(req.user.sub, id);
    return { code: 0, message: 'ok', data };
  }
}

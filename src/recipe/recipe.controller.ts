import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RecommendRecipeDto } from './dto/recommend-recipe.dto';
import { RecipeRecommendService } from './recipe-recommend.service';
import type { RecommendResponse } from './recommend.types';
import { RecipeFavoritesService } from './recipe-favorites.service';
import { JwtOrWxAuthGuard } from '../auth/jwt-or-wx-auth.guard';
import type { JwtPayloadUser } from '../auth/jwt-payload';

function isCallContainerRequest(
  headers: Record<string, string | undefined>,
): boolean {
  return !!(
    headers['x-wx-openid'] ||
    headers['x-wx-from'] ||
    headers['x-wx-source'] ||
    headers['x-wx-env'] ||
    headers['x-wx-appid']
  );
}

function shouldAsyncLiveAi(
  headers: Record<string, string | undefined>,
): boolean {
  if (process.env.RECOMMEND_ASYNC_LIVE_AI === '0') return false;
  if (process.env.RECOMMEND_ASYNC_LIVE_AI === '1') return true;
  if (process.env.NODE_ENV === 'production') return true;
  return isCallContainerRequest(headers);
}

function toRecommendPayload(result: RecommendResponse) {
  const top = result.items[0];
  return {
    items: result.items,
    recipe: top?.recipe ?? null,
    recipeId: top?.recipeId ?? null,
    score: top?.score ?? 0,
    missing: top?.missing ?? [],
    source: result.source,
    queryHash: result.queryHash,
    normalizedIngredients: result.normalizedIngredients,
    aiPending: result.aiPending === true,
  };
}

@Controller('recipe')
export class RecipeController {
  constructor(
    private readonly recommendService: RecipeRecommendService,
    private readonly favoritesService: RecipeFavoritesService,
  ) {}

  @Post('recommend')
  @HttpCode(200)
  async recommend(
    @Body() dto: RecommendRecipeDto,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const result = await this.recommendService.recommend(dto.ingredients, {
      asyncLiveAi: shouldAsyncLiveAi(headers),
    });
    return { code: 0, message: 'ok', data: toRecommendPayload(result) };
  }

  @Post('recommend/poll')
  @HttpCode(200)
  async recommendPoll(@Body() dto: RecommendRecipeDto) {
    const result = await this.recommendService.pollRecommend(dto.ingredients);
    return { code: 0, message: 'ok', data: toRecommendPayload(result) };
  }

  @Get('favorites')
  @UseGuards(JwtOrWxAuthGuard)
  async listFavorites(@Req() req: { user: JwtPayloadUser }) {
    const data = await this.favoritesService.list(req.user.sub);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/favorite')
  @UseGuards(JwtOrWxAuthGuard)
  @HttpCode(200)
  async addFavorite(
    @Param('id') id: string,
    @Req() req: { user: JwtPayloadUser },
  ) {
    const data = await this.favoritesService.add(req.user.sub, id);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id/favorite')
  @UseGuards(JwtOrWxAuthGuard)
  async removeFavorite(
    @Param('id') id: string,
    @Req() req: { user: JwtPayloadUser },
  ) {
    const data = await this.favoritesService.remove(req.user.sub, id);
    return { code: 0, message: 'ok', data };
  }
}

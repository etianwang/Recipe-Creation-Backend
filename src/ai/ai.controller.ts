import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiQuotaGuard } from './ai-quota.guard';
import { AiRecipeService } from './ai-recipe.service';
import { AiQueryDto } from './dto/ai-query.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiRecipeService: AiRecipeService) {}

  @Post('query')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, AiQuotaGuard)
  async query(@Body() dto: AiQueryDto) {
    const result = await this.aiRecipeService.generateOrLoad(dto.ingredients);
    return {
      code: 0,
      message: 'ok',
      data: {
        source: result.source,
        queryHash: result.queryHash,
        recipe: result.recipe.name,
        confidence: result.recipe.confidence,
        ingredients: result.recipe.ingredients,
        steps: result.recipe.steps,
        substitutes: result.recipe.substitutes,
        structured: true,
      },
    };
  }
}

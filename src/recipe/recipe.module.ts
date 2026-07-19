import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module';
import { AiModule } from '../ai/ai.module';
import { RecipeController } from './recipe.controller';
import { RecipeRecommendService } from './recipe-recommend.service';

@Module({
  imports: [SearchModule, AiModule],
  controllers: [RecipeController],
  providers: [RecipeRecommendService],
})
export class RecipeModule {}

import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { RecipeController } from './recipe.controller';
import { RecipeRecommendService } from './recipe-recommend.service';
import { RecipeFavoritesService } from './recipe-favorites.service';

@Module({
  imports: [SearchModule, AiModule, AuthModule],
  controllers: [RecipeController],
  providers: [RecipeRecommendService, RecipeFavoritesService],
})
export class RecipeModule {}

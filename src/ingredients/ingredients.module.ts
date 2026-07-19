import { Module } from '@nestjs/common';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';
import { SubstitutesService } from './substitutes.service';

@Module({
  controllers: [IngredientsController],
  providers: [IngredientsService, SubstitutesService],
  exports: [IngredientsService, SubstitutesService],
})
export class IngredientsModule {}

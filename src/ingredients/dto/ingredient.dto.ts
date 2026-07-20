import { IngredientCategory } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @IsEnum(IngredientCategory)
  category!: IngredientCategory;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  taste?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class SubmitIngredientResultDto {
  reviewId!: string;
  status!: 'PENDING';
  name!: string;
  category!: IngredientCategory;
}

export class UpdateIngredientDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsEnum(IngredientCategory)
  category?: IngredientCategory;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  taste?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class SearchIngredientsDto {
  @IsOptional()
  @IsString()
  q?: string;

  /** enum 或中文：主料/辅料/调味料/香料/饮品 */
  @IsOptional()
  @IsString()
  category?: string;
}

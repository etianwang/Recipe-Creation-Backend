import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class RecommendRecipeDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'ingredients must not be empty' })
  @IsString({ each: true })
  ingredients!: string[];
}

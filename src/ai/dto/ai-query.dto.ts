import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class AiQueryDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ingredients!: string[];
}

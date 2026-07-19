import { IsNotEmpty, IsString } from 'class-validator';

export class LookupSubstitutesDto {
  @IsString()
  @IsNotEmpty()
  ingredient!: string;
}

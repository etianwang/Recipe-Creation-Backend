import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LookupSubstitutesDto {
  @IsString()
  @IsNotEmpty()
  ingredient!: string;

  /** AI/推荐页传入的材料类型：主料|辅料|调料|香料|饮品；库中不存在时按此分类自动入库 */
  @IsOptional()
  @IsString()
  type?: string;
}

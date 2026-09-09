import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

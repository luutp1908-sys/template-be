import { IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  // workspaceId is intentionally optional at API level for global categories.
  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @IsInt()
  @IsOptional()
  @IsInt()
  @IsIn([0, 1, 2])
  editorTypeId?: number;

  @IsUUID()
  @IsOptional()
  parentId?: string | null;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  slug?: string;
}

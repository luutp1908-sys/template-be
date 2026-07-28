import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  // workspaceId is intentionally optional at API level for global categories.
  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @IsUUID()
  @IsOptional()
  editorTypeId?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string | null;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  slug?: string;
}

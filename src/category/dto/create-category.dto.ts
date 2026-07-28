import { IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { EDITOR_TYPE_IDS } from '../../common/constants/editor-types.constant';

export class CreateCategoryDto {
  // workspaceId is intentionally optional at API level for global categories.
  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @IsInt()
  @IsIn(EDITOR_TYPE_IDS)
  @IsOptional()
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

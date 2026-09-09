import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { EDITOR_TYPE_IDS } from '../../common/constants/editor-types.constant';

export class CreateCategoryDto {
  @IsInt()
  @IsIn(EDITOR_TYPE_IDS)
  @IsOptional()
  editorTypeId?: number;

  @IsUUID()
  @IsOptional()
  parentId?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(140)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  @IsOptional()
  slug?: string;
}

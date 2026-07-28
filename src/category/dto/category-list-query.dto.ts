import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { EDITOR_TYPE_IDS } from '../../common/constants/editor-types.constant';

export class CategoryListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by editor type id' })
  @Type(() => Number)
  @IsInt()
  @IsIn(EDITOR_TYPE_IDS)
  @IsOptional()
  editorTypeId?: number;

  @ApiPropertyOptional({ description: 'Search by category name' })
  @IsString()
  @MaxLength(240)
  @IsOptional()
  search?: string;
}

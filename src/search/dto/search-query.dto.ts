import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { EDITOR_TYPE_IDS } from '../../common/constants/editor-types.constant';

export class SearchQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search term' })
  @IsString()
  @MaxLength(240)
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ enum: ['template', 'category', 'all'], default: 'template' })
  @IsIn(['template', 'category', 'all'])
  @IsOptional()
  scope?: 'template' | 'category' | 'all' = 'template';

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 10;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsIn(['draft', 'published', 'archived'])
  @IsOptional()
  status?: 'draft' | 'published' | 'archived';

  @ApiPropertyOptional({ description: 'Filter by editor type id' })
  @Type(() => Number)
  @IsInt()
  @IsIn(EDITOR_TYPE_IDS)
  @IsOptional()
  editorTypeId?: number;

  @ApiPropertyOptional({ description: 'Filter by category id' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}

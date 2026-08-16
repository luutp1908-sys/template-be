import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { EDITOR_TYPE_IDS } from '../../common/constants/editor-types.constant';

export class TemplateStatsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by editor type id' })
  @Type(() => Number)
  @IsInt()
  @IsIn(EDITOR_TYPE_IDS)
  @IsOptional()
  editorTypeId?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsIn(['draft', 'published', 'archived'])
  @IsOptional()
  status?: 'draft' | 'published' | 'archived';
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

const sortableFields = ['createdAt', 'updatedAt', 'title', 'status'] as const;

export class TemplateListQueryDto {
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

  @ApiPropertyOptional({ enum: sortableFields, default: 'createdAt' })
  @IsIn(sortableFields)
  @IsOptional()
  sortBy?: (typeof sortableFields)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Search by template title' })
  @IsString()
  @MaxLength(240)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by editor type id' })
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1, 2])
  @IsOptional()
  editorTypeId?: number;

  @ApiPropertyOptional({ description: 'Filter by category id' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by author id' })
  @IsUUID()
  @IsOptional()
  authorId?: string;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsIn(['draft', 'published', 'archived'])
  @IsOptional()
  status?: 'draft' | 'published' | 'archived';
}

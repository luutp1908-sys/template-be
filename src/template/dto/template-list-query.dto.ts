import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

const sortableFields = ['createdAt', 'updatedAt', 'title', 'publishedAt'] as const;

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

  @ApiPropertyOptional({ description: 'Filter by workspace id' })
  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'Filter by editor type id' })
  @IsUUID()
  @IsOptional()
  editorTypeId?: string;

  @ApiPropertyOptional({ description: 'Filter by author id' })
  @IsUUID()
  @IsOptional()
  authorId?: string;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsIn(['draft', 'published', 'archived'])
  @IsOptional()
  status?: 'draft' | 'published' | 'archived';

  @ApiPropertyOptional({ description: 'Include soft-deleted templates', default: false })
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  includeDeleted?: boolean = false;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CategoryListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by editor type id' })
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1, 2])
  @IsOptional()
  editorTypeId?: number;

  @ApiPropertyOptional({ description: 'Search by category name' })
  @IsString()
  @MaxLength(240)
  @IsOptional()
  search?: string;
}

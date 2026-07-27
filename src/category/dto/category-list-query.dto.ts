import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CategoryListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by editor type id' })
  @IsUUID()
  @IsOptional()
  editorTypeId?: string;

  @ApiPropertyOptional({ description: 'Search by category name' })
  @IsString()
  @MaxLength(240)
  @IsOptional()
  search?: string;
}

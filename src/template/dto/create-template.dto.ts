import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ maxLength: 240 })
  @IsString()
  @MaxLength(240)
  title!: string;

  @ApiProperty({ maxLength: 260 })
  @IsString()
  @MaxLength(260)
  slug!: string;

  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty()
  @IsUUID()
  editorTypeId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  thumbnailAssetId?: string;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'], default: 'draft' })
  @IsIn(['draft', 'published', 'archived'])
  @IsOptional()
  status?: 'draft' | 'published' | 'archived';
}

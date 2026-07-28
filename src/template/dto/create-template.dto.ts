import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { EDITOR_TYPE_IDS } from '../../common/constants/editor-types.constant';

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
  @IsInt()
  @IsIn(EDITOR_TYPE_IDS)
  editorTypeId!: number;

  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({ maxLength: 2048 })
  @IsString()
  @MaxLength(2048)
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'], default: 'draft' })
  @IsIn(['draft', 'published', 'archived'])
  @IsOptional()
  status?: 'draft' | 'published' | 'archived';
}

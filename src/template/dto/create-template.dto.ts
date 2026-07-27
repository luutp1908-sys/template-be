import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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
  @IsIn([0, 1, 2])
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

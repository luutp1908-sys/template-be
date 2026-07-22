import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateUserDraftDto {
  @ApiProperty()
  @IsUUID()
  templateId!: string;

  @ApiProperty({ maxLength: 240 })
  @IsString()
  @MaxLength(240)
  name!: string;

  @ApiProperty({ type: Object })
  @IsObject()
  content!: Prisma.InputJsonValue;

  @ApiPropertyOptional({ maxLength: 2048 })
  @IsString()
  @MaxLength(2048)
  @IsOptional()
  thumbnail?: string;
}
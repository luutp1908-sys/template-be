import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsObject } from 'class-validator';

export class CreateTemplateContentDto {
  @ApiProperty({ type: Object })
  @IsObject()
  content!: Prisma.InputJsonValue;
}
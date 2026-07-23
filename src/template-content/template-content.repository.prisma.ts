import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateTemplateContentDto } from './dto/create-template-content.dto';
import { UpdateTemplateContentDto } from './dto/update-template-content.dto';
import { TemplateContentEntity } from './template-content.entity';

@Injectable()
export class TemplateContentRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async upsert(templateId: string, payload: CreateTemplateContentDto): Promise<TemplateContentEntity> {
    return this.prisma.templateContent.upsert({
      where: { templateId },
      create: {
        templateId,
        content: payload.content,
      },
      update: {
        content: payload.content,
      },
    });
  }

  async findByTemplateId(templateId: string): Promise<TemplateContentEntity | null> {
    return this.prisma.templateContent.findUnique({ where: { templateId } });
  }

  async update(
    templateId: string,
    payload: UpdateTemplateContentDto,
  ): Promise<TemplateContentEntity | null> {
    const existing = await this.prisma.templateContent.findUnique({ where: { templateId } });
    if (!existing) {
      return null;
    }

    return this.prisma.templateContent.update({
      where: { templateId },
      data: {
        ...(payload.content !== undefined ? { content: payload.content } : {}),
      },
    });
  }

  async remove(templateId: string): Promise<boolean> {
    const result = await this.prisma.templateContent.deleteMany({ where: { templateId } });
    return result.count > 0;
  }
}

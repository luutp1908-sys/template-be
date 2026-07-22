import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateTemplateContentDto } from './dto/create-template-content.dto';
import { UpdateTemplateContentDto } from './dto/update-template-content.dto';
import { TemplateContentEntity } from './template-content.entity';

@Injectable()
export class TemplateContentRepository {
  private readonly isMockMode: boolean;
  private readonly mockStore = new Map<string, TemplateContentEntity>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.isMockMode = this.configService.get<boolean>('app.mockMode', false);
  }

  async upsert(templateId: string, payload: CreateTemplateContentDto): Promise<TemplateContentEntity> {
    if (this.isMockMode) {
      const record: TemplateContentEntity = {
        templateId,
        content: payload.content as Prisma.JsonValue,
      };

      this.mockStore.set(templateId, record);
      return record;
    }

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
    if (this.isMockMode) {
      return this.mockStore.get(templateId) ?? null;
    }

    return this.prisma.templateContent.findUnique({ where: { templateId } });
  }

  async update(
    templateId: string,
    payload: UpdateTemplateContentDto,
  ): Promise<TemplateContentEntity | null> {
    if (this.isMockMode) {
      const current = this.mockStore.get(templateId);
      if (!current) {
        return null;
      }

      if (payload.content !== undefined) {
        current.content = payload.content as Prisma.JsonValue;
      }

      this.mockStore.set(templateId, current);
      return current;
    }

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
    if (this.isMockMode) {
      return this.mockStore.delete(templateId);
    }

    const result = await this.prisma.templateContent.deleteMany({ where: { templateId } });
    return result.count > 0;
  }
}
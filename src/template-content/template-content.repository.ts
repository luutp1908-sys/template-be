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
    if (this.isMockMode) {
      this.seed();
    }
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

  /** Seed the in-memory mock store with a sample templateContent for frontend dev */
  private seed() {
    if (this.mockStore.size > 0) return;

    const sample: Prisma.JsonValue = {
      templateId: 'tmpl_001',
      title: 'Mocked Template 001',
      pages: [
        {
          width: 800,
          height: 600,
          background: { type: 'color', color: '#ffffff' },
          layers: [
            { id: 'obj1', type: 'rect', x: 50, y: 50, width: 200, height: 100, fill: '#ffcc00' },
            {
              id: 'obj2',
              type: 'text',
              x: 300,
              y: 80,
              text: 'Hello from BE',
              fontSize: 24,
              textConfig: {
                value: 'Hello from BE',
                type: 'text-box',
                width: '200px',
                height: '48px',
                translate: [0, 0],
                rotate: 0,
                fontFamily: 'Arial, sans-serif',
                fontSize: '24px',
                fontColor: '#1a1a1a',
                textAlign: 'left',
                lineHeight: 1.2,
                letterSpacing: '0px',
                isBold: false,
                isItalic: false,
                isUnderline: false,
                isCapital: false,
                presentationType: 'body',
                colorPaletteType: null,
                externalFontUrl: null,
                isLogoQrCode: false,
              },
            },
            {
              id: 'obj3',
              type: 'image',
              x: 100,
              y: 200,
              width: 300,
              height: 180,
              imageConfig: {
                size: { width: 300, height: 180 },
                width: 300,
                height: 180,
                translate: [0, 0],
                rotate: 0,
                url: '/public/sample.jpg',
                tagNames: [],
                colorConfig: {},
                cropImage: { width: 300, height: 180, translate: [0, 0] },
                scaleX: 1,
                scaleY: 1,
                replaced: false,
                isPro: false,
                isLoading: false,
                isLocked: false,
              },
            }
          ],
        },
        {
          width: 800,
          height: 600,
          background: { type: 'color', color: '#f6f8fa' },
          layers: [
            { id: 'obj4', type: 'rect', x: 20, y: 20, width: 760, height: 560, fill: '#e8eef6' },
            {
              id: 'obj5',
              type: 'text',
              x: 60,
              y: 60,
              text: 'Second page',
              fontSize: 18,
              textConfig: {
                value: 'Second page',
                type: 'text-box',
                width: '300px',
                height: '36px',
                translate: [0, 0],
                rotate: 0,
                fontFamily: 'Arial, sans-serif',
                fontSize: '18px',
                fontColor: '#1a1a1a',
                textAlign: 'left',
                lineHeight: 1.2,
                letterSpacing: '0px',
                isBold: false,
                isItalic: false,
                isUnderline: false,
                isCapital: false,
                presentationType: 'body',
                colorPaletteType: null,
                externalFontUrl: null,
                isLogoQrCode: false,
              },
            }
          ],
        },
      ],
    };

    const record: TemplateContentEntity = {
      templateId: 'tmpl_001',
      content: sample,
    };

    this.mockStore.set(record.templateId, record);
  }
}
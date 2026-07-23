import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { CreateTemplateContentDto } from './dto/create-template-content.dto';
import { UpdateTemplateContentDto } from './dto/update-template-content.dto';
import { TemplateContentEntity } from './template-content.entity';

@Injectable()
export class TemplateContentRepository {
  private readonly mockStore = new Map<string, TemplateContentEntity>();
  private readonly mockFilePath: string;

  constructor(private readonly configService: ConfigService) {
    this.mockFilePath = join(process.cwd(), 'src', 'common', 'testing', 'mock-template-contents.json')
    try {
      const dir = dirname(this.mockFilePath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      if (!existsSync(this.mockFilePath)) writeFileSync(this.mockFilePath, JSON.stringify([]))
      const raw = readFileSync(this.mockFilePath, 'utf8') || '[]'
      const arr = JSON.parse(raw) as any[]
      arr.forEach((it) => {
        const rec: TemplateContentEntity = {
          templateId: it.templateId,
          content: it.content,
        }
        this.mockStore.set(rec.templateId, rec)
      })
      this.seed();
    } catch {
      this.mockStore.clear()
      this.seed();
    }
  }

  private persistMockStore() {
    try {
      const arr = [...this.mockStore.values()].map((e) => ({
        templateId: e.templateId,
        content: e.content,
      }))
      writeFileSync(this.mockFilePath, JSON.stringify(arr, null, 2), 'utf8')
      // eslint-disable-next-line no-console
      console.log('[mock-template-contents] persisted', this.mockFilePath, arr.length, 'items')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[mock-template-contents] failed to persist', err)
    }
  }

  async upsert(templateId: string, payload: CreateTemplateContentDto): Promise<TemplateContentEntity> {
    const record: TemplateContentEntity = {
      templateId,
      content: payload.content as Prisma.JsonValue,
    };

    this.mockStore.set(templateId, record);
    this.persistMockStore()
    return record;
  }

  async findByTemplateId(templateId: string): Promise<TemplateContentEntity | null> {
    return this.mockStore.get(templateId) ?? null;
  }

  async update(
    templateId: string,
    payload: UpdateTemplateContentDto,
  ): Promise<TemplateContentEntity | null> {
    const current = this.mockStore.get(templateId);
    if (!current) {
      return null;
    }

    if (payload.content !== undefined) {
      current.content = payload.content as Prisma.JsonValue;
    }

    this.mockStore.set(templateId, current);
    this.persistMockStore()
    return current;
  }

  async remove(templateId: string): Promise<boolean> {
    const deleted = this.mockStore.delete(templateId);
    this.persistMockStore()
    return deleted;
  }

  private seed() {
    if (this.mockStore.size > 0) return;

    const sample: Prisma.JsonValue = {
      templateId: 'tmpl_001',
      title: 'Mocked Template 001',
      blocks: [],
    };

    const record: TemplateContentEntity = {
      templateId: 'tmpl_001',
      content: sample,
    };

    this.mockStore.set(record.templateId, record);
  }
}

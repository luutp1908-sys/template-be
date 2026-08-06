import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateListQueryDto } from './dto/template-list-query.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateEntity, TemplateListEntity } from './template.entity';
import { TemplateRepository } from './template.data.repository';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templateListCachePrefix = 'template:list:';

  constructor(
    @Inject('TEMPLATE_REPOSITORY') private readonly repository: any,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async create(payload: CreateTemplateDto, authorId: string): Promise<TemplateEntity> {
    const created = await this.repository.create(payload, authorId);
    await this.invalidateTemplateListCache();
    return created;
  }

  async findById(id: string): Promise<TemplateEntity> {
    const template = await this.repository.findById(id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async findMany(query: TemplateListQueryDto): Promise<TemplateListEntity> {
    const key = this.buildTemplateListCacheKey(query);
    const cached = await this.cacheService.getJson<TemplateListEntity>(key);
    if (cached) {
      return cached;
    }

    const result = await this.repository.findMany(query);
    const ttlMs = this.configService.get<number>('cache.ttlMs.templateList', 300000);
    try {
      await this.cacheService.setJson(key, result, ttlMs);
    } catch (error) {
      this.logger.warn(`Template list cache set failed: ${(error as Error).message}`);
    }

    return result;
  }

  async update(id: string, payload: UpdateTemplateDto): Promise<TemplateEntity> {
    const template = await this.repository.update(id, payload);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.invalidateTemplateListCache();

    return template;
  }

  async publish(id: string): Promise<TemplateEntity> {
    const template = await this.repository.publish(id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.invalidateTemplateListCache();

    return template;
  }

  async archive(id: string): Promise<TemplateEntity> {
    const template = await this.repository.archive(id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.invalidateTemplateListCache();

    return template;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.repository.remove(id);
    if (!removed) {
      throw new NotFoundException('Template not found');
    }

    await this.invalidateTemplateListCache();
  }

  private buildTemplateListCacheKey(query: TemplateListQueryDto): string {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = (query.sortOrder ?? 'desc').toLowerCase();
    const status = query.status ?? '_';
    const editorTypeId = query.editorTypeId ?? '_';
    const categoryId = query.categoryId ?? '_';
    const authorId = query.authorId ?? '_';
    const search = (query.search ?? '').trim().toLowerCase() || '_';

    return (
      `${this.templateListCachePrefix}` +
      `p=${page}|ps=${pageSize}|sb=${sortBy}|so=${sortOrder}` +
      `|st=${status}|et=${editorTypeId}|cat=${categoryId}|auth=${authorId}|q=${search}`
    );
  }

  private async invalidateTemplateListCache(): Promise<void> {
    try {
      await this.cacheService.deleteByPattern(`${this.templateListCachePrefix}*`);
    } catch (error) {
      this.logger.warn(
        `Template list cache invalidation failed: ${(error as Error).message}`,
      );
    }
  }
}

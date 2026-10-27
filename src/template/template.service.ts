import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { Logger } from 'nestjs-pino';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateListQueryDto } from './dto/template-list-query.dto';
import { TemplateStatsQueryDto } from './dto/template-stats-query.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import {
  CategoryPopularityStatsEntity,
  PopularityStatsEntity,
  TemplateEntity,
  TemplateListEntity,
} from './template.entity';
import { TemplateRepository } from './template.data.repository';
import { TemplateIdempotencyService } from './template-idempotency.service';

@Injectable()
export class TemplateService {
  private readonly templateListCachePrefix = 'template:list:';
  private readonly createRetryAttempts = 3;
  private readonly createRetryBaseDelayMs = 150;
  private readonly createRetryMaxDelayMs = 1200;

  constructor(
    @Inject('TEMPLATE_REPOSITORY') private readonly repository: any,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    private readonly idempotencyService: TemplateIdempotencyService,
  ) {}

  async create(
    payload: CreateTemplateDto,
    authorId: string,
    idempotencyKey?: string,
  ): Promise<TemplateEntity> {
    if (!authorId) {
      throw new UnauthorizedException('Authentication is required to create template');
    }

    const created = await this.idempotencyService.run<TemplateEntity>({
      userId: authorId,
      idempotencyKey,
      operation: 'create',
      payload,
      execute: () => this.executeCreateWithRetry(payload, authorId),
    });
    await this.invalidateTemplateListCache();
    return created;
  }

  private async executeCreateWithRetry(
    payload: CreateTemplateDto,
    authorId: string,
  ): Promise<TemplateEntity> {
    let attempt = 0;

    while (attempt < this.createRetryAttempts) {
      attempt += 1;
      try {
        return await this.repository.create(payload, authorId);
      } catch (error) {
        const canRetry = this.isRetryableCreateError(error) && attempt < this.createRetryAttempts;
        if (!canRetry) {
          throw error;
        }

        const delayMs = this.computeBackoffDelayMs(attempt);
        this.logger.warn(
          `Template create attempt ${attempt} failed; retrying in ${delayMs}ms: ${(error as Error).message}`,
        );
        await this.sleep(delayMs);
      }
    }

    throw new Error('Template create retries exhausted');
  }

  private isRetryableCreateError(error: unknown): boolean {
    const maybe = error as {
      code?: string;
      name?: string;
      message?: string;
      status?: number;
      statusCode?: number;
    };

    const status = maybe.status ?? maybe.statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return false;
    }

    const code = (maybe.code ?? '').toUpperCase();
    if (['P1001', 'P1002', 'P1008', 'P1017', 'P2034', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'].includes(code)) {
      return true;
    }

    const name = (maybe.name ?? '').toLowerCase();
    if (name.includes('prismaclientinitializationerror') || name.includes('prismaclientrustpanicerror')) {
      return true;
    }

    const message = (maybe.message ?? '').toLowerCase();
    return message.includes('timeout') || message.includes('temporarily') || message.includes('connection reset');
  }

  private computeBackoffDelayMs(attempt: number): number {
    const backoff = this.createRetryBaseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
    return Math.min(this.createRetryMaxDelayMs, backoff);
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
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

  async getPopularityStats(query: TemplateStatsQueryDto): Promise<PopularityStatsEntity[]> {
    const normalizedQuery = {
      ...query,
      limit: query.limit ?? 10,
      editorTypeId: query.editorTypeId,
    };

    return this.repository.getPopularityStats(normalizedQuery);
  }

  async getCategoryStats(query: TemplateStatsQueryDto): Promise<CategoryPopularityStatsEntity[]> {
    const normalizedQuery = {
      ...query,
      limit: query.limit ?? 10,
      editorTypeId: query.editorTypeId,
    };

    return this.repository.getCategoryStats(normalizedQuery);
  }

  async hasTemplatesInCategory(categoryId: string): Promise<boolean> {
    return this.repository.existsByCategoryId(categoryId);
  }

  async findByCategoryIds(categoryIds: string[]): Promise<any[]> {
    return this.repository.findByCategoryIds(categoryIds);
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

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { CacheService } from '../cache/cache.service';

type IdempotencyStatus = 'processing' | 'completed';

interface IdempotencyCacheEntry<T = unknown> {
  requestHash: string;
  status: IdempotencyStatus;
  response?: T;
}

@Injectable()
export class TemplateIdempotencyService {
  private readonly keyTtlMs = 24 * 60 * 60 * 1000;

  constructor(private readonly cacheService: CacheService) {}

  async run<T>(params: {
    userId: string;
    idempotencyKey?: string;
    operation: string;
    payload: unknown;
    execute: () => Promise<T>;
  }): Promise<T> {
    const key = this.normalizeKey(params.idempotencyKey);
    const requestHash = this.buildRequestHash(params.operation, params.payload);
    const cacheKey = this.buildCacheKey(params.userId, params.operation, key);

    const existing = await this.cacheService.getJson<IdempotencyCacheEntry<T>>(cacheKey);
    if (existing) {
      this.assertMatchingHash(existing.requestHash, requestHash);

      if (existing.status === 'completed') {
        return existing.response as T;
      }

      throw new ConflictException('A request with the same Idempotency-Key is already in progress.');
    }

    const claimed = await this.cacheService.setJsonIfAbsent<IdempotencyCacheEntry<T>>(
      cacheKey,
      {
        requestHash,
        status: 'processing',
      },
      this.keyTtlMs,
    );

    if (!claimed) {
      const retryExisting = await this.cacheService.getJson<IdempotencyCacheEntry<T>>(cacheKey);
      if (retryExisting) {
        this.assertMatchingHash(retryExisting.requestHash, requestHash);

        if (retryExisting.status === 'completed') {
          return retryExisting.response as T;
        }
      }

      throw new ConflictException('A request with the same Idempotency-Key is already in progress.');
    }

    try {
      const response = await params.execute();
      await this.cacheService.setJson<IdempotencyCacheEntry<T>>(
        cacheKey,
        {
          requestHash,
          status: 'completed',
          response,
        },
        this.keyTtlMs,
      );
      return response;
    } catch (error) {
      await this.cacheService.delete(cacheKey);
      throw error;
    }
  }

  private normalizeKey(idempotencyKey?: string): string {
    const key = (idempotencyKey ?? '').trim();
    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }

    if (key.length > 128) {
      throw new BadRequestException('Idempotency-Key header is too long.');
    }

    return key;
  }

  private buildCacheKey(userId: string, operation: string, key: string): string {
    return `idempotency:template:${userId}:${operation}:${key}`;
  }

  private buildRequestHash(operation: string, payload: unknown): string {
    return createHash('sha256')
      .update(operation)
      .update(':')
      .update(JSON.stringify(payload ?? null))
      .digest('hex');
  }

  private assertMatchingHash(existingHash: string, requestHash: string): void {
    if (existingHash !== requestHash) {
      throw new ConflictException('Idempotency-Key was already used with a different request payload.');
    }
  }
}

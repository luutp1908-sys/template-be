import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { createClient, type RedisClientType } from 'redis';
import { Logger } from 'nestjs-pino';
import { enrichWithTraceContext } from '../common/telemetry/trace-context';

export interface CacheMetricSnapshot {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  fallbackEvents: number;
  backendAvailable: boolean;
  bypassEnabled: boolean;
  forceRefreshEnabled: boolean;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType | null = null;
  private isAvailable = false;
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private deletes = 0;
  private fallbackEvents = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.configService.get<boolean>('cache.enabled', true);
    const mockMode = this.configService.get<boolean>('app.mockMode', false);

    if (!enabled || mockMode) {
      this.fallbackEvents += 1;
      return;
    }

    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const tls = this.configService.get<boolean>('redis.tls', false);
    const password = this.configService.get<string>('redis.password') || undefined;
    const connectTimeout = this.configService.get<number>('cache.connectTimeoutMs', 2000);

    this.client = createClient({
      socket: {
        host,
        port,
        connectTimeout,
        ...(tls ? { tls: true as const } : {}),
      },
      password,
    });

    this.client.on('error', (error: Error) => {
      this.isAvailable = false;
      this.fallbackEvents += 1;
      this.logger.warn(enrichWithTraceContext({ message: `Cache backend error: ${error.message}` }));
    });

    try {
      await this.client.connect();
      this.isAvailable = true;
      this.logger.log(enrichWithTraceContext({ message: 'Cache backend connected' }));
    } catch (error) {
      this.client = null;
      this.isAvailable = false;
      this.fallbackEvents += 1;
      this.logger.warn(enrichWithTraceContext({ message: `Cache backend unavailable, continuing without cache: ${(error as Error).message}` }));
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  private startRedisSpan(operation: 'get' | 'set' | 'del' | 'scan', key: string): {
    span: Span;
    startedAt: number;
  } {
    const tracer = trace.getTracer('be.redis');
    const span = tracer.startSpan(`redis.${operation}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'redis',
        'db.operation': operation,
        'db.statement': `KEY ${key}`,
      },
    });

    return { span, startedAt: Date.now() };
  }

  private finalizeRedisSpan(span: Span, startedAt: number, success: boolean, error?: unknown): void {
    const duration = Date.now() - startedAt;

    span.setAttributes({
      'db.duration_ms': duration,
      'db.result': success ? 'success' : 'error',
    });

    if (success) {
      span.setStatus({ code: SpanStatusCode.OK });
    } else {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Redis operation failed',
      });
    }

    span.end();
  }

  async getJson<T>(key: string): Promise<T | null> {
    const bypassEnabled = this.configService.get<boolean>('cache.bypass', false);
    const forceRefreshEnabled = this.configService.get<boolean>('cache.forceRefresh', false);

    if (bypassEnabled) {
      this.misses += 1;
      return null;
    }

    if (forceRefreshEnabled) {
      const { span, startedAt } = this.startRedisSpan('del', key);
      try {
        if (this.client && this.isAvailable) {
          await this.client.del(this.withPrefix(key));
          this.deletes += 1;
        }
        this.misses += 1;
        this.finalizeRedisSpan(span, startedAt, true);
        return null;
      } catch (error) {
        this.misses += 1;
        this.finalizeRedisSpan(span, startedAt, false, error);
        throw error;
      }
    }

    if (!this.client || !this.isAvailable) {
      this.fallbackEvents += 1;
      this.misses += 1;
      return null;
    }

    const { span, startedAt } = this.startRedisSpan('get', key);

    try {
      const value = await this.client.get(this.withPrefix(key));
      if (!value) {
        this.misses += 1;
        this.finalizeRedisSpan(span, startedAt, true);
        return null;
      }

      this.hits += 1;

      try {
        const parsed = JSON.parse(value) as T;
        this.finalizeRedisSpan(span, startedAt, true);
        return parsed;
      } catch {
        this.misses += 1;
        this.finalizeRedisSpan(span, startedAt, true);
        return null;
      }
    } catch (error) {
      this.misses += 1;
      this.finalizeRedisSpan(span, startedAt, false, error);
      throw error;
    }
  }

  async setJson<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (!this.client || !this.isAvailable) {
      this.fallbackEvents += 1;
      return;
    }

    const { span, startedAt } = this.startRedisSpan('set', key);

    try {
      await this.client.set(this.withPrefix(key), JSON.stringify(value), {
        PX: ttlMs,
      });
      this.sets += 1;
      this.finalizeRedisSpan(span, startedAt, true);
    } catch (error) {
      this.finalizeRedisSpan(span, startedAt, false, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client || !this.isAvailable) {
      this.fallbackEvents += 1;
      return;
    }

    const { span, startedAt } = this.startRedisSpan('del', key);

    try {
      await this.client.del(this.withPrefix(key));
      this.deletes += 1;
      this.finalizeRedisSpan(span, startedAt, true);
    } catch (error) {
      this.finalizeRedisSpan(span, startedAt, false, error);
      throw error;
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.client || !this.isAvailable) {
      this.fallbackEvents += 1;
      return 0;
    }

    const { span, startedAt } = this.startRedisSpan('scan', pattern);

    try {
      let deleted = 0;
      let cursor = '0';
      const namespacedPattern = this.withPrefix(pattern);

      do {
        const result = await this.client.scan(cursor, {
          MATCH: namespacedPattern,
          COUNT: 100,
        });
        cursor = result.cursor;
        const keys = result.keys;

        if (keys.length > 0) {
          deleted += await this.client.del(keys);
        }
      } while (cursor !== '0');

      this.deletes += deleted;
      this.finalizeRedisSpan(span, startedAt, true);
      return deleted;
    } catch (error) {
      this.finalizeRedisSpan(span, startedAt, false, error);
      throw error;
    }
  }

  snapshot(): CacheMetricSnapshot {
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      fallbackEvents: this.fallbackEvents,
      backendAvailable: this.isAvailable,
      bypassEnabled: this.configService.get<boolean>('cache.bypass', false),
      forceRefreshEnabled: this.configService.get<boolean>('cache.forceRefresh', false),
    };
  }

  private withPrefix(key: string): string {
    const prefix = this.configService.get<string>('cache.keyPrefix', 'template-saas');
    return `${prefix}:${key}`;
  }
}

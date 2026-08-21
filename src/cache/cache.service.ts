import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: RedisClientType | null = null;
  private isAvailable = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.configService.get<boolean>('cache.enabled', true);
    const mockMode = this.configService.get<boolean>('app.mockMode', false);

    if (!enabled || mockMode) {
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
      this.logger.warn(`Cache backend error: ${error.message}`);
    });

    try {
      await this.client.connect();
      this.isAvailable = true;
      this.logger.log('Cache backend connected');
    } catch (error) {
      this.client = null;
      this.isAvailable = false;
      this.logger.warn(`Cache backend unavailable, continuing without cache: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isAvailable) {
      return null;
    }

    const value = await this.client.get(this.withPrefix(key));
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (!this.client || !this.isAvailable) {
      return;
    }

    await this.client.set(this.withPrefix(key), JSON.stringify(value), {
      PX: ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.client || !this.isAvailable) {
      return;
    }

    await this.client.del(this.withPrefix(key));
  }

  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.client || !this.isAvailable) {
      return 0;
    }

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

    return deleted;
  }

  private withPrefix(key: string): string {
    const prefix = this.configService.get<string>('cache.keyPrefix', 'template-saas');
    return `${prefix}:${key}`;
  }
}

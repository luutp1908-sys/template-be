import { Controller, Get, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { createClient } from 'redis';
import { CacheService } from '../../cache/cache.service';
import { PrismaService } from '../../database/prisma.service';
import { QueueHealthService } from '../../queue/queue-health.service';
import { MetricsService } from '../metrics/metrics.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly metricsService: MetricsService,
    private readonly cacheService: CacheService,
    @Optional() private readonly queueHealthService?: QueueHealthService,
  ) {}

  @Get('ready')
  async readiness() {
    const [database, redis, queue] = await Promise.all([
      this.checkDatabaseReadiness(),
      this.checkRedisReadiness(),
      this.checkQueueReadiness(),
    ]);

    const checks = { database, redis, queue };
    const blockingFailures = [database, redis, queue].filter((check) => check.required && !check.healthy);

    if (blockingFailures.length > 0) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks,
      });
    }

    return {
      status: 'ready',
      checks,
    };
  }

  @Get('metrics')
  async metrics() {
    const cache = this.cacheService.snapshot();
    const queue = this.queueHealthService ? await this.queueHealthService.checkReadiness() : undefined;

    if (queue && typeof this.metricsService.recordQueueHealth === 'function') {
      this.metricsService.recordQueueHealth(queue);
    }

    const metrics = this.metricsService.snapshot();
    const queueAlerts = metrics.queue?.alerts ?? {
      workerHeartbeatStale: false,
      backlogGrowth: false,
      repeatedQueueFailures: false,
      redisConnectivityDegraded: false,
    };

    return {
      ...metrics,
      alerts: queueAlerts,
      cache,
      queue: queue ? { ...queue, alerts: queueAlerts } : undefined,
      saturation: {
        cacheBackendAvailable: cache.backendAvailable,
        cacheFallbackEvents: cache.fallbackEvents,
        cacheBypassEnabled: cache.bypassEnabled,
        cacheForceRefreshEnabled: cache.forceRefreshEnabled,
        isSaturated: !cache.backendAvailable || cache.fallbackEvents > 0,
      },
    };
  }

  private async checkDatabaseReadiness(): Promise<{
    required: boolean;
    healthy: boolean;
    status: 'ok' | 'skipped' | 'degraded';
    reason?: string;
  }> {
    const mockMode = this.configService.get<boolean>('app.mockMode', false);
    if (mockMode) {
      return {
        required: false,
        healthy: true,
        status: 'skipped',
        reason: 'Mock mode enabled',
      };
    }

    try {
      await this.prismaService.$queryRaw(Prisma.sql`SELECT 1`);
      return {
        required: true,
        healthy: true,
        status: 'ok',
      };
    } catch (error) {
      return {
        required: true,
        healthy: false,
        status: 'degraded',
        reason: error instanceof Error ? error.message : 'Database probe failed',
      };
    }
  }

  private async checkRedisReadiness(): Promise<{
    required: boolean;
    healthy: boolean;
    status: 'ok' | 'skipped' | 'degraded';
    reason?: string;
  }> {
    const mockMode = this.configService.get<boolean>('app.mockMode', false);
    if (mockMode) {
      return {
        required: false,
        healthy: true,
        status: 'skipped',
        reason: 'Mock mode enabled',
      };
    }

    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password') || undefined;
    const tls = this.configService.get<boolean>('redis.tls', false);

    const client = createClient({
      socket: {
        host,
        port,
        ...(tls ? { tls: true as const } : {}),
      },
      password,
    });

    try {
      await client.connect();
      await client.ping();
      return {
        required: true,
        healthy: true,
        status: 'ok',
      };
    } catch (error) {
      return {
        required: true,
        healthy: false,
        status: 'degraded',
        reason: error instanceof Error ? error.message : 'Redis probe failed',
      };
    } finally {
      if (client.isOpen) {
        await client.quit().catch(() => undefined);
      }
    }
  }

  private async checkQueueReadiness(): Promise<{
    required: boolean;
    healthy: boolean;
    status: 'ok' | 'skipped' | 'degraded';
    reason?: string;
    enabled?: boolean;
    details?: Record<string, unknown>;
  }> {
    if (!this.queueHealthService) {
      return {
        required: false,
        healthy: true,
        status: 'skipped',
        reason: 'Queue module not enabled in this runtime',
      };
    }

    return this.queueHealthService.checkReadiness();
  }
}

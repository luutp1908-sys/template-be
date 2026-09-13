import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { Logger } from 'nestjs-pino';
import { MetricsService } from '../common/metrics/metrics.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    @Optional() private readonly metricsService?: MetricsService,
  ) {
    super();
  }

  override $queryRaw<T>(query: Prisma.Sql | TemplateStringsArray, ...values: any[]): any {
    const startedAt = Date.now();
    const promise = super.$queryRaw(query as any, ...values) as any;

    return promise
      .then((result: T) => {
        this.metricsService?.recordDatabaseQuery(Date.now() - startedAt, true);
        return result;
      })
      .catch((error: unknown) => {
        this.metricsService?.recordDatabaseQuery(Date.now() - startedAt, false);
        throw error;
      });
  }

  override $executeRaw(query: Prisma.Sql | TemplateStringsArray, ...values: any[]): any {
    const startedAt = Date.now();
    const promise = super.$executeRaw(query as any, ...values) as any;

    return promise
      .then((result: number) => {
        this.metricsService?.recordDatabaseQuery(Date.now() - startedAt, true);
        return result;
      })
      .catch((error: unknown) => {
        this.metricsService?.recordDatabaseQuery(Date.now() - startedAt, false);
        throw error;
      });
  }

  async onModuleInit(): Promise<void> {
    if (this.configService.get<boolean>('app.mockMode', false)) {
      return;
    }

    try {
      await this.$connect();
      this.logger.log(
        {
          module: 'database',
          operation: 'prisma.connect',
          startupMode: this.configService.get<'fail-fast' | 'warn'>('database.startupMode', 'warn'),
        },
        'database.connected',
      );
    } catch (error) {
      const startupMode = this.configService.get<'fail-fast' | 'warn'>(
        'database.startupMode',
        'warn',
      );
      const reason = (error as Error).message;

      if (startupMode === 'fail-fast') {
        this.logger.error(
          {
            module: 'database',
            operation: 'prisma.connect',
            startupMode,
            reason,
          },
          'database.connection.failed',
        );
        throw error;
      }

      this.logger.warn(
        {
          module: 'database',
          operation: 'prisma.connect',
          startupMode,
          reason,
        },
        'database.connection.skipped',
      );
    }
  }
}

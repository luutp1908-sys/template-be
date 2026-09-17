import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { Logger } from 'nestjs-pino';
import { MetricsService } from '../common/metrics/metrics.service';
import { enrichWithTraceContext } from '../common/telemetry/trace-context';

function buildPrismaDatasourceUrl(configService: ConfigService): string {
  const rawUrl = configService.get<string>('database.url');
  if (!rawUrl) {
    return 'postgresql://postgres:postgres@localhost:5432/postgres';
  }

  try {
    const parsed = new URL(rawUrl);
    const poolMin = configService.get<number>('database.pool.min', 1);
    const poolMax = configService.get<number>('database.pool.max', 10);
    const poolTimeoutMs = configService.get<number>('database.pool.connectionTimeoutMs', 20000);

    parsed.searchParams.set('connection_limit', String(Math.max(1, poolMax)));
    parsed.searchParams.set('pool_timeout', String(Math.max(1000, poolTimeoutMs / 1000)));
    parsed.searchParams.set('statement_cache_size', String(Math.max(1, poolMin * 10)));

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    @Optional() private readonly metricsService?: MetricsService,
  ) {
    super({
      datasources: {
        db: {
          url: buildPrismaDatasourceUrl(configService),
        },
      },
    });
  }

  private buildQueryText(query: Prisma.Sql | TemplateStringsArray, values: any[]): string {
    if (typeof (query as any).sql === 'string') {
      return (query as any).sql;
    }

    if (Array.isArray(query)) {
      return String.raw({ raw: query } as any, ...values);
    }

    return String(query);
  }

  private startQuerySpan(operation: string, query: Prisma.Sql | TemplateStringsArray, values: any[]) {
    const tracer = trace.getTracer('be.prisma');
    const statement = this.buildQueryText(query, values).slice(0, 2048);
    const span = tracer.startSpan(`prisma.${operation}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'postgresql',
        'db.operation': operation,
        'db.statement': statement,
        'db.name': this.configService.get<string>('database.name', 'postgres'),
      },
    });

    return {
      span,
      startedAt: Date.now(),
    };
  }

  private finalizeQuerySpan(
    span: Span,
    startedAt: number,
    success: boolean,
    error?: unknown,
  ): void {
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
        message: error instanceof Error ? error.message : 'Database query failed',
      });
    }

    span.end();
  }

  override $queryRaw<T>(query: Prisma.Sql | TemplateStringsArray, ...values: any[]): any {
    const { span, startedAt } = this.startQuerySpan('query_raw', query, values);
    const promise = super.$queryRaw(query as any, ...values) as any;

    return promise
      .then((result: T) => {
        this.finalizeQuerySpan(span, startedAt, true);
        this.metricsService?.recordDatabaseQuery(Date.now() - startedAt, true);
        return result;
      })
      .catch((error: unknown) => {
        this.finalizeQuerySpan(span, startedAt, false, error);
        this.metricsService?.recordDatabaseQuery(Date.now() - startedAt, false);
        throw error;
      });
  }

  override $executeRaw(query: Prisma.Sql | TemplateStringsArray, ...values: any[]): any {
    const { span, startedAt } = this.startQuerySpan('execute_raw', query, values);
    const promise = super.$executeRaw(query as any, ...values) as any;

    return promise
      .then((result: number) => {
        this.finalizeQuerySpan(span, startedAt, true);
        this.metricsService?.recordDatabaseQuery(Date.now() - startedAt, true);
        return result;
      })
      .catch((error: unknown) => {
        this.finalizeQuerySpan(span, startedAt, false, error);
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
        enrichWithTraceContext({
          module: 'database',
          operation: 'prisma.connect',
          startupMode: this.configService.get<'fail-fast' | 'warn'>('database.startupMode', 'warn'),
        }),
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
          enrichWithTraceContext({
            module: 'database',
            operation: 'prisma.connect',
            startupMode,
            reason,
          }),
          'database.connection.failed',
        );
        throw error;
      }

      this.logger.warn(
        enrichWithTraceContext({
          module: 'database',
          operation: 'prisma.connect',
          startupMode,
          reason,
        }),
        'database.connection.skipped',
      );
    }
  }
}

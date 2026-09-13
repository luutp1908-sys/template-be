import { Prisma, PrismaClient } from '@prisma/client';
import * as otel from '@opentelemetry/api';
import { PrismaService } from './prisma.service';

jest.mock('@opentelemetry/api', () => {
  const span = {
    setAttributes: jest.fn(),
    setStatus: jest.fn(),
    end: jest.fn(),
  };

  return {
    trace: {
      getTracer: jest.fn(() => ({
        startSpan: jest.fn(() => span),
      })),
    },
    SpanKind: { CLIENT: 3 },
    SpanStatusCode: { OK: 1, ERROR: 2 },
  };
});

describe('PrismaService tracing', () => {
  it('creates a client span for raw queries and records DB metrics', async () => {
    const span = {
      setAttributes: jest.fn(),
      setStatus: jest.fn(),
      end: jest.fn(),
    };
    const tracer = { startSpan: jest.fn(() => span) };
    (otel.trace.getTracer as jest.Mock).mockReturnValue(tracer);

    const configService = { get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => defaultValue) } as any;
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any;
    const metricsService = { recordDatabaseQuery: jest.fn() } as any;

    const querySpy = jest.spyOn(PrismaClient.prototype, '$queryRaw').mockResolvedValueOnce([{ ok: true }]);

    const service = new PrismaService(configService, logger, metricsService);
    await service.$queryRaw(Prisma.sql`SELECT 1` as any);

    expect(querySpy).toHaveBeenCalledTimes(1);
    expect(otel.trace.getTracer).toHaveBeenCalledWith('be.prisma');
    expect(tracer.startSpan).toHaveBeenCalledWith(
      'prisma.query_raw',
      expect.objectContaining({
        kind: 3,
        attributes: expect.objectContaining({
          'db.system': 'postgresql',
          'db.operation': 'query_raw',
        }),
      }),
    );
    expect(span.setStatus).toHaveBeenCalledWith(expect.objectContaining({ code: 1 }));
    expect(metricsService.recordDatabaseQuery).toHaveBeenCalledWith(expect.any(Number), true);
  });
});

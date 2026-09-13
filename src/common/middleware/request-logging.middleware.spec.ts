import { EventEmitter } from 'events';
import { trace } from '@opentelemetry/api';

jest.mock('@opentelemetry/api', () => {
  const span = {
    setAttributes: jest.fn(),
    setStatus: jest.fn(),
    end: jest.fn(),
    spanContext: jest.fn(() => ({ traceId: 'trace-abc', spanId: 'span-xyz' })),
  };

  return {
    context: {
      active: jest.fn(() => ({ active: true })),
      with: jest.fn((_ctx, fn) => fn()),
      setSpan: jest.fn((ctx, nextSpan) => ({ ...ctx, span: nextSpan })),
    },
    trace: {
      getTracer: jest.fn(() => ({ startSpan: jest.fn(() => span) })),
      setSpan: jest.fn((ctx, nextSpan) => ({ ...ctx, span: nextSpan })),
      getSpanContext: jest.fn(() => ({ traceId: 'trace-abc', spanId: 'span-xyz' })),
    },
    SpanKind: { SERVER: 2 },
    SpanStatusCode: { OK: 1, ERROR: 2 },
  };
});

import { RequestLoggingMiddleware } from './request-logging.middleware';

type ResponseLike = EventEmitter & {
  statusCode: number;
  setHeader: jest.Mock;
};

describe('RequestLoggingMiddleware', () => {
  it('records metrics but skips request.completed logs when request logs are disabled', () => {
    const logger = { log: jest.fn() } as any;
    const configService = { get: jest.fn().mockReturnValue(false) } as any;
    const metricsService = { recordRequest: jest.fn() } as any;

    const middleware = new RequestLoggingMiddleware(logger, configService, metricsService);

    const req = {
      headers: {},
      method: 'GET',
      originalUrl: '/api/v1/health',
    } as any;

    const res = new EventEmitter() as ResponseLike;
    res.statusCode = 200;
    res.setHeader = jest.fn();

    const next = jest.fn();
    middleware.use(req, res as any, next);

    res.emit('finish');

    expect(next).toHaveBeenCalledTimes(1);
    expect(metricsService.recordRequest).toHaveBeenCalledTimes(1);
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('records metrics and emits request.completed logs when request logs are enabled', () => {
    const logger = { log: jest.fn() } as any;
    const configService = { get: jest.fn().mockReturnValue(true) } as any;
    const metricsService = { recordRequest: jest.fn() } as any;

    const middleware = new RequestLoggingMiddleware(logger, configService, metricsService);

    const req = {
      headers: { 'x-request-id': 'req-1' },
      method: 'POST',
      originalUrl: '/api/v1/export/jobs',
      user: { id: 'user-1' },
    } as any;

    const res = new EventEmitter() as ResponseLike;
    res.statusCode = 201;
    res.setHeader = jest.fn();

    middleware.use(req, res as any, jest.fn());

    res.emit('finish');

    expect(metricsService.recordRequest).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-1',
        method: 'POST',
        path: '/api/v1/export/jobs',
        statusCode: 201,
        userId: 'user-1',
        traceId: 'trace-abc',
        spanId: 'span-xyz',
      }),
      'request.completed',
    );
    expect(trace.getTracer).toHaveBeenCalledWith('be.http');
  });
});

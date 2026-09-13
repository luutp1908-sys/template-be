import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { context, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Logger } from 'nestjs-pino';
import { enrichWithTraceContext } from '../telemetry/trace-context';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly enableRequestLogs: boolean;

  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {
    this.enableRequestLogs = this.configService.get<boolean>('log.enableRequestLogs', false);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const httpTarget = req.originalUrl ?? req.url ?? '';
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const tracer = trace.getTracer('be.http');
    const span = tracer.startSpan(`${req.method} ${httpTarget || 'request'}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.target': httpTarget,
        'http.route': req.route?.path ?? httpTarget,
        'http.request_id': requestId,
      },
    });
    const spanContext = span.spanContext();
    const activeContext = trace.setSpan(context.active(), span);

    res.on('finish', () => {
      const duration = Date.now() - startedAt;
      const statusCode = res.statusCode;

      this.metricsService.recordRequest(statusCode, duration);
      span.setAttributes({
        'http.status_code': statusCode,
        'http.duration_ms': duration,
      });
      span.setStatus({
        code: statusCode >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.OK,
        message: statusCode >= 500 ? 'HTTP error' : 'OK',
      });
      span.end();

      if (!this.enableRequestLogs) {
        return;
      }

      const logContext = enrichWithTraceContext(
        {
          module: 'http',
          operation: 'request.completed',
          requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode,
          duration,
          userId: (req as any).user?.id ?? undefined,
        },
        spanContext ?? trace.getSpanContext(activeContext),
      );

      this.logger.log(logContext, 'request.completed');
    });
    context.with(activeContext, () => next());
  }
}

import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Logger } from 'nestjs-pino';
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
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    req.headers['x-request-id'] = requestId;

    res.on('finish', () => {
      const duration = Date.now() - startedAt;
      this.metricsService.recordRequest(res.statusCode, duration);

      if (!this.enableRequestLogs) {
        return;
      }

      this.logger.log(
        {
          requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          userId: (req as any).user?.id ?? undefined,
        },
        'request.completed',
      );
    });
    next();
  }
}

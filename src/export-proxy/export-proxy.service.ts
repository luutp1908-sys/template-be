import { HttpException, HttpStatus, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { context, propagation, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { CreateExportDto } from '../export/dto/create-export.dto';
import { ExportEntity } from '../export/export.entity';

type DownloadResult = {
  body: Buffer;
  contentType: string;
  contentDisposition: string;
};

@Injectable()
export class ExportProxyService {
  constructor(private readonly configService: ConfigService) {}

  async createJob(payload: CreateExportDto, authorization?: string): Promise<ExportEntity> {
    return this.forwardJson<ExportEntity>('POST', '/api/v1/export/jobs', payload, authorization);
  }

  async findJobStatus(id: string, authorization?: string): Promise<ExportEntity> {
    return this.forwardJson<ExportEntity>('GET', `/api/v1/export/jobs/${encodeURIComponent(id)}`, undefined, authorization);
  }

  async download(id: string, authorization?: string): Promise<DownloadResult> {
    const tracer = trace.getTracer('be.export-proxy.service');

    return tracer.startActiveSpan('service.export.download', { kind: SpanKind.INTERNAL }, async (span) => {
      span.setAttributes({
        'app.operation': 'export.download',
        'export.job.id': id,
        'auth.present': !!authorization,
      });

      try {
        const validationSpan = tracer.startSpan('service.export.download.validate', { kind: SpanKind.INTERNAL });
        validationSpan.setAttributes({
          'export.job.id': id,
          'validation.mode': 'download-request',
        });
        validationSpan.setStatus({ code: SpanStatusCode.OK });
        validationSpan.end();

        const upstreamUrl = this.buildUrl(`/api/v1/export/jobs/${encodeURIComponent(id)}/download`);
        const urlSpan = tracer.startSpan('service.export.download.build-url', { kind: SpanKind.INTERNAL });
        urlSpan.setAttributes({ 'url.full': upstreamUrl });
        urlSpan.setStatus({ code: SpanStatusCode.OK });
        urlSpan.end();

        const response = await this.fetchWithTimeout(upstreamUrl, {
          method: 'GET',
          headers: this.buildHeaders(authorization),
        });

        if (!response.ok) {
          await this.throwFromErrorResponse(response);
        }

        const parseSpan = tracer.startSpan('service.export.download.parse-response', { kind: SpanKind.INTERNAL });
        const contentType = response.headers.get('content-type') ?? 'application/pdf';
        const contentDisposition =
          response.headers.get('content-disposition') ?? `attachment; filename="${id}.pdf"`;
        const body = Buffer.from(await response.arrayBuffer());
        parseSpan.setAttributes({
          'http.response.content_type': contentType,
          'http.response.content_length': body.length,
          'content.disposition': contentDisposition,
        });
        parseSpan.setStatus({ code: SpanStatusCode.OK });
        parseSpan.end();

        span.setStatus({ code: SpanStatusCode.OK });
        return {
          body,
          contentType,
          contentDisposition,
        };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Export download failed',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async forwardJson<T>(
    method: 'GET' | 'POST',
    path: string,
    payload?: unknown,
    authorization?: string,
  ): Promise<T> {
    const response = await this.fetchWithTimeout(this.buildUrl(path), {
      method,
      headers: this.buildHeaders(authorization, payload !== undefined),
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });

    if (!response.ok) {
      await this.throwFromErrorResponse(response);
    }

    const parsed = (await response.json()) as { data?: T } | T;
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      const wrapped = parsed as { data?: T };
      if (wrapped.data !== undefined) {
        return wrapped.data;
      }
    }

    return parsed as T;
  }

  private buildUrl(path: string): string {
    const baseUrl = this.configService.get<string>('app.exportServiceUrl', '').trim();
    if (!baseUrl) {
      throw new InternalServerErrorException('EXPORT_SERVICE_URL is not configured');
    }

    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
    return `${normalizedBaseUrl}${path}`;
  }

  private buildHeaders(authorization?: string, includeJsonContentType = false): Record<string, string> {
    const headers: Record<string, string> = {
      accept: 'application/json',
    };

    const carrier: Record<string, string> = {};
    propagation.inject(context.active(), carrier);

    if (carrier.traceparent) {
      headers.traceparent = carrier.traceparent;
    }

    if (authorization) {
      headers.authorization = authorization;
    }

    if (includeJsonContentType) {
      headers['content-type'] = 'application/json';
    }

    return headers;
  }

  private async fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
    const tracer = trace.getTracer('be.export-proxy.service');
    const fetchSpan = tracer.startSpan('service.export.download.upstream-fetch', {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': init.method ?? 'GET',
        'url.full': input,
      },
    });

    const controller = new AbortController();
    const timeoutMs = 15_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      fetchSpan.setAttributes({ 'http.status_code': response.status });
      fetchSpan.setStatus({ code: SpanStatusCode.OK });
      return response;
    } catch (error) {
      fetchSpan.recordException(error as Error);
      fetchSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Upstream fetch failed',
      });

      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException('Export proxy request timed out', HttpStatus.GATEWAY_TIMEOUT);
      }

      throw new HttpException('Export proxy upstream request failed', HttpStatus.BAD_GATEWAY);
    } finally {
      clearTimeout(timer);
      fetchSpan.end();
    }
  }

  private async throwFromErrorResponse(response: Response): Promise<never> {
    let message: string | string[] = `Export service returned ${response.status}`;

    try {
      const parsed = (await response.json()) as { message?: string | string[] };
      if (parsed?.message) {
        message = parsed.message;
      }
    } catch {
      // Keep default message when non-JSON error response is returned.
    }

    throw new HttpException(message, response.status);
  }
}

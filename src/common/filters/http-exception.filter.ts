import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import {
  AuthorizationError,
  isAuthorizationError,
} from '../errors/authorization-error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? 'unknown';
    const path = request.originalUrl ?? request.url;

    const { status, responseBody, code } = this.resolveExceptionContext(exception);

    const isObjectResponse =
      typeof responseBody === 'object' && responseBody !== null && !Array.isArray(responseBody);

    const rawMessage = this.resolveRawMessage(responseBody, status);

    const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
    const details =
      status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? undefined
        : Array.isArray(rawMessage)
          ? rawMessage
          : isObjectResponse && 'details' in responseBody
            ? (responseBody as { details?: unknown }).details
            : undefined;

    this.logException(exception, {
      requestId,
      method: request.method,
      path,
      status,
      code,
      userId: (request as Request & { user?: { id?: string } }).user?.id,
    });

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      path,
      requestId,
    });
  }

  private resolveExceptionContext(
    exception: unknown,
  ): { status: number; responseBody: unknown; code: string } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      return {
        status,
        responseBody: exception.getResponse(),
        code: HttpStatus[status] ?? 'HTTP_EXCEPTION',
      };
    }

    if (isAuthorizationError(exception)) {
      return {
        status: this.resolveAuthorizationStatus(exception),
        responseBody: {
          message: exception.message,
          details: exception.details,
        },
        code: exception.code,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      responseBody: null,
      code: HttpStatus[HttpStatus.INTERNAL_SERVER_ERROR] ?? 'HTTP_EXCEPTION',
    };
  }

  private resolveAuthorizationStatus(exception: AuthorizationError): number {
    if (exception.code === 'AUTHENTICATION_REQUIRED') {
      return HttpStatus.UNAUTHORIZED;
    }

    return HttpStatus.FORBIDDEN;
  }

  private resolveRawMessage(exceptionResponse: unknown, status: number): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      !Array.isArray(exceptionResponse) &&
      'message' in exceptionResponse
    ) {
      return (exceptionResponse as { message?: string | string[] }).message ?? 'Unexpected error';
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Internal server error';
    }

    return 'Unexpected error';
  }

  private logException(
    exception: unknown,
    context: {
      requestId: string;
      method: string;
      path: string;
      status: number;
      code: string;
      userId?: string;
    },
  ): void {
    const errorCause =
      exception instanceof Error
        ? (exception as Error & { cause?: unknown }).cause
        : undefined;

    const payload = {
      requestId: context.requestId,
      method: context.method,
      path: context.path,
      status: context.status,
      code: context.code,
      userId: context.userId,
      exceptionName: exception instanceof Error ? exception.name : typeof exception,
      exceptionMessage: exception instanceof Error ? exception.message : String(exception),
      cause: errorCause !== undefined ? String(errorCause) : undefined,
    };

    if (context.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          ...payload,
          err: exception instanceof Error ? exception : undefined,
        },
        'http.exception',
      );
      return;
    }

    this.logger.warn(payload, 'http.exception');
  }
}

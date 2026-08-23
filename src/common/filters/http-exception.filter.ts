import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? 'unknown';

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    const isObjectResponse =
      typeof exceptionResponse === 'object' && exceptionResponse !== null && !Array.isArray(exceptionResponse);

    const rawMessage =
      isObjectResponse && 'message' in exceptionResponse
        ? ((exceptionResponse as { message?: string | string[] }).message ?? 'Unexpected error')
        : 'Unexpected error';

    const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
    const details = Array.isArray(rawMessage) ? rawMessage :
      isObjectResponse && 'details' in exceptionResponse ? (exceptionResponse as { details?: unknown }).details : undefined;
    const errorCode = HttpStatus[status] ?? 'HTTP_EXCEPTION';

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    });
  }
}

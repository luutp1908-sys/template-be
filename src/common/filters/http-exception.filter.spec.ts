import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const makeHost = (url: string, requestId = 'req-123') => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          url,
          headers: { 'x-request-id': requestId },
        }),
      }),
    } as unknown as ArgumentsHost;

    return { host, json, status };
  };

  it('standardizes bad-request errors with a canonical error envelope', () => {
    const filter = new HttpExceptionFilter();
    const { host, json, status } = makeHost('/api/v1/auth/login');

    filter.catch(new BadRequestException(['email is required']), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: expect.any(String),
          details: expect.any(Array),
        }),
        timestamp: expect.any(String),
        path: '/api/v1/auth/login',
        requestId: 'req-123',
      }),
    );
  });

  it.each([
    ['unauthorized', new UnauthorizedException('Invalid token'), HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED'],
    ['forbidden', new ForbiddenException('No access'), HttpStatus.FORBIDDEN, 'FORBIDDEN'],
    ['not found', new NotFoundException('User not found'), HttpStatus.NOT_FOUND, 'NOT_FOUND'],
    ['internal', new InternalServerErrorException('Unexpected failure'), HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR'],
  ])('standardizes %s errors', (_label, exception, expectedStatus, expectedCode) => {
    const filter = new HttpExceptionFilter();
    const { host, json, status } = makeHost('/api/v1/test');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(expectedStatus);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: expectedCode,
          message: expect.any(String),
        }),
        path: '/api/v1/test',
        requestId: 'req-123',
      }),
    );
  });
});

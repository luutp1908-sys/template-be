import { BadRequestException, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('standardizes bad-request errors with a canonical error envelope', () => {
    const filter = new HttpExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          url: '/api/v1/auth/login',
          headers: { 'x-request-id': 'req-123' },
        }),
      }),
    } as unknown as ArgumentsHost;

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
});

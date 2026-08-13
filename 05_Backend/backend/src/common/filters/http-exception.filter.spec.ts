import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { AUTH_ERROR_CODES } from '../../auth/auth-error.codes';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  function createHost(url = '/api/v1/auth/login', retryAfter?: string) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = {
      status,
      json,
      getHeader: jest.fn().mockReturnValue(retryAfter),
    };
    const request = { url };
    return {
      host: {
        switchToHttp: () => ({
          getResponse: () => response,
          getRequest: () => request,
        }),
      } as never,
      json,
      status,
    };
  }

  it('maps 429 responses to TOO_MANY_REQUESTS with retryAfterSeconds', () => {
    const { host, json, status } = createHost('/api/v1/auth/login', '42');

    filter.catch(new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS), host);

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: AUTH_ERROR_CODES.TOO_MANY_REQUESTS,
        message: 'Too many requests. Please try again later.',
        retryAfterSeconds: 42,
      }),
    );
  });

  it('does not include secrets in 429 payloads', () => {
    const { host, json } = createHost('/api/v1/auth/refresh', '15');

    filter.catch(new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS), host);

    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toMatch(/password|token|hash/i);
  });
});

import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AUTH_ERROR_CODES } from './auth-error.codes';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

describe('AuthRateLimitGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, number> = {
        AUTH_LOGIN_RATE_LIMIT: 2,
        AUTH_LOGIN_RATE_WINDOW_MS: 60_000,
        AUTH_REFRESH_RATE_LIMIT: 2,
        AUTH_REFRESH_RATE_WINDOW_MS: 60_000,
      };
      return values[key];
    }),
  };

  function createContext(ip = '127.0.0.1'): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ ip, socket: { remoteAddress: ip } }),
      }),
    } as ExecutionContext;
  }

  it('allows requests under the configured limit and rejects with TOO_MANY_REQUESTS after it', () => {
    reflector.getAllAndOverride.mockReturnValue('login');
    const guard = new AuthRateLimitGuard(
      reflector as unknown as Reflector,
      configService as unknown as ConfigService,
    );
    const context = createContext('10.0.0.8');

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);

    try {
      guard.canActivate(context);
      throw new Error('expected throttle');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({
          code: AUTH_ERROR_CODES.TOO_MANY_REQUESTS,
          retryAfterSeconds: expect.any(Number),
          message: 'Too many requests. Please try again later.',
        }),
      );
    }
  });

  it('uses environment-driven login and refresh limits from AUTH_* keys', () => {
    const loginConfig = {
      get: jest.fn((key: string) =>
        key === 'AUTH_LOGIN_RATE_LIMIT' ? 20 : key === 'AUTH_LOGIN_RATE_WINDOW_MS' ? 900000 : undefined,
      ),
    };
    reflector.getAllAndOverride.mockReturnValue('login');
    const guard = new AuthRateLimitGuard(
      reflector as unknown as Reflector,
      loginConfig as unknown as ConfigService,
    );

    expect(loginConfig.get).not.toHaveBeenCalled();
    guard.canActivate(createContext('10.0.0.9'));
    expect(loginConfig.get).toHaveBeenCalledWith('AUTH_LOGIN_RATE_LIMIT');
    expect(loginConfig.get).toHaveBeenCalledWith('AUTH_LOGIN_RATE_WINDOW_MS');
  });
});

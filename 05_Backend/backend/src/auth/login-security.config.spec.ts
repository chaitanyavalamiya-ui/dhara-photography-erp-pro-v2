import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_LOGIN_RATE_LIMIT,
  DEFAULT_LOGIN_RATE_WINDOW_MS,
  DEFAULT_REFRESH_RATE_LIMIT,
  DEFAULT_REFRESH_RATE_WINDOW_MS,
  getLoginSecurityConfig,
  getRetryAfterSeconds,
} from './login-security.config';

describe('login-security.config', () => {
  it('uses approved local defaults for login and refresh rate limits', () => {
    const config = getLoginSecurityConfig({
      get: jest.fn(() => undefined),
    } as unknown as ConfigService);

    expect(config.loginThrottleLimit).toBe(DEFAULT_LOGIN_RATE_LIMIT);
    expect(config.loginThrottleTtlMs).toBe(DEFAULT_LOGIN_RATE_WINDOW_MS);
    expect(config.refreshThrottleLimit).toBe(DEFAULT_REFRESH_RATE_LIMIT);
    expect(config.refreshThrottleTtlMs).toBe(DEFAULT_REFRESH_RATE_WINDOW_MS);
    expect(config.loginThrottleLimit).toBe(20);
    expect(config.loginThrottleTtlMs).toBe(15 * 60 * 1000);
    expect(config.refreshThrottleLimit).toBe(60);
    expect(config.refreshThrottleTtlMs).toBe(15 * 60 * 1000);
  });

  it('reads AUTH_* environment-driven rate limit values', () => {
    const values: Record<string, number> = {
      AUTH_LOGIN_RATE_LIMIT: 20,
      AUTH_LOGIN_RATE_WINDOW_MS: 900000,
      AUTH_REFRESH_RATE_LIMIT: 60,
      AUTH_REFRESH_RATE_WINDOW_MS: 900000,
    };

    const config = getLoginSecurityConfig({
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService);

    expect(config.loginThrottleLimit).toBe(20);
    expect(config.loginThrottleTtlMs).toBe(900000);
    expect(config.refreshThrottleLimit).toBe(60);
    expect(config.refreshThrottleTtlMs).toBe(900000);
  });

  it('computes retryAfterSeconds as a positive whole number', () => {
    const lockedUntil = new Date(Date.now() + 90 * 1000);
    expect(getRetryAfterSeconds(lockedUntil)).toBeGreaterThanOrEqual(90);
    expect(getRetryAfterSeconds(lockedUntil)).toBeLessThanOrEqual(91);
  });
});

import { ConfigService } from '@nestjs/config';

export const DEFAULT_MAX_FAILED_ATTEMPTS = 5;
export const DEFAULT_LOCK_DURATION_MINUTES = 15;
export const DEFAULT_LOGIN_RATE_LIMIT = 20;
export const DEFAULT_LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;
export const DEFAULT_REFRESH_RATE_LIMIT = 60;
export const DEFAULT_REFRESH_RATE_WINDOW_MS = 15 * 60 * 1000;

export interface LoginSecurityConfig {
  maxFailedAttempts: number;
  lockDurationMinutes: number;
  loginThrottleLimit: number;
  loginThrottleTtlMs: number;
  refreshThrottleLimit: number;
  refreshThrottleTtlMs: number;
}

function readPositiveInt(
  configService: ConfigService | undefined,
  key: string,
  fallback: number,
): number {
  const raw = configService ? configService.get<string | number>(key) : process.env[key];
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export function getLoginSecurityConfig(configService?: ConfigService): LoginSecurityConfig {
  return {
    maxFailedAttempts: readPositiveInt(
      configService,
      'LOGIN_MAX_FAILED_ATTEMPTS',
      DEFAULT_MAX_FAILED_ATTEMPTS,
    ),
    lockDurationMinutes: readPositiveInt(
      configService,
      'LOGIN_LOCK_DURATION_MINUTES',
      DEFAULT_LOCK_DURATION_MINUTES,
    ),
    loginThrottleLimit: readPositiveInt(
      configService,
      'AUTH_LOGIN_RATE_LIMIT',
      DEFAULT_LOGIN_RATE_LIMIT,
    ),
    loginThrottleTtlMs: readPositiveInt(
      configService,
      'AUTH_LOGIN_RATE_WINDOW_MS',
      DEFAULT_LOGIN_RATE_WINDOW_MS,
    ),
    refreshThrottleLimit: readPositiveInt(
      configService,
      'AUTH_REFRESH_RATE_LIMIT',
      DEFAULT_REFRESH_RATE_LIMIT,
    ),
    refreshThrottleTtlMs: readPositiveInt(
      configService,
      'AUTH_REFRESH_RATE_WINDOW_MS',
      DEFAULT_REFRESH_RATE_WINDOW_MS,
    ),
  };
}

export function getRetryAfterSeconds(lockedUntil: Date): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
}

export function formatLockMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Account temporarily locked. Try again in ${minutes} minute(s).`;
}

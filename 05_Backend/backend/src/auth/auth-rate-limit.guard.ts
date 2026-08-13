import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AUTH_ERROR_CODES } from './auth-error.codes';
import { getLoginSecurityConfig } from './login-security.config';

export const AUTH_RATE_LIMIT_KEY = 'authRateLimitBucket';
export type AuthRateLimitBucket = 'login' | 'refresh';

export const AuthRateLimit = (bucket: AuthRateLimitBucket) =>
  SetMetadata(AUTH_RATE_LIMIT_KEY, bucket);

/**
 * In-memory per-IP rate limiter for auth routes.
 * Local/offline by design: no Redis or cloud store. Counters live in this
 * API process and reset when the process restarts.
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const bucket = this.reflector.getAllAndOverride<AuthRateLimitBucket | undefined>(
      AUTH_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!bucket) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const securityConfig = getLoginSecurityConfig(this.configService);
    const limit =
      bucket === 'login' ? securityConfig.loginThrottleLimit : securityConfig.refreshThrottleLimit;
    const ttlMs =
      bucket === 'login' ? securityConfig.loginThrottleTtlMs : securityConfig.refreshThrottleTtlMs;

    const ip = request.ip || request.socket?.remoteAddress || 'unknown';
    const key = `${bucket}:${ip}`;
    const now = Date.now();
    const windowStart = now - ttlMs;
    const stamps = (this.hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

    if (stamps.length >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((stamps[0] + ttlMs - now) / 1000));
      throw new HttpException(
        {
          message: 'Too many requests. Please try again later.',
          code: AUTH_ERROR_CODES.TOO_MANY_REQUESTS,
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    stamps.push(now);
    this.hits.set(key, stamps);
    return true;
  }
}

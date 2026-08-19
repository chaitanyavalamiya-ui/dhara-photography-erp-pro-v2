import type { HelmetOptions } from 'helmet';
import { isLocalhostOrigin } from './production-env';

export function parseCorsOrigins(
  corsOrigin: string | undefined,
  fallback = 'http://localhost:5173',
  options?: { production?: boolean },
): string[] {
  const production = options?.production === true;
  const raw = corsOrigin?.trim();
  const origins = (raw || fallback)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!raw) {
    if (production) {
      throw new Error('CORS_ORIGIN is required in production.');
    }
    return origins;
  }

  if (production && (origins.length === 0 || origins.every(isLocalhostOrigin))) {
    throw new Error('CORS_ORIGIN cannot be localhost-only in production.');
  }

  return origins;
}

export function isCorsOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return true;
  }
  return allowedOrigins.includes(origin);
}

export function createHelmetOptions(): HelmetOptions {
  return {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  };
}

const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function payloadContainsPrototypePollution(value: unknown, depth = 0): boolean {
  if (value == null || typeof value !== 'object' || depth > 12) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => payloadContainsPrototypePollution(item, depth + 1));
  }

  for (const key of Object.getOwnPropertyNames(value)) {
    if (DANGEROUS_KEYS.has(key)) {
      return true;
    }
    if (payloadContainsPrototypePollution((value as Record<string, unknown>)[key], depth + 1)) {
      return true;
    }
  }

  return false;
}

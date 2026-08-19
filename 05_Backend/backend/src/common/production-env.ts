const WEAK_SECRET_MARKERS = ['change_me', 'changeme'];

export function isLocalhostOrigin(value: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i.test(value);
}

export function validateProductionEnv(env: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = String(env.NODE_ENV ?? '').trim();
  if (nodeEnv !== 'production') {
    return env;
  }

  const databaseUrl = String(env.DATABASE_URL ?? '').trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required in production.');
  }

  const jwtSecret = String(env.JWT_ACCESS_SECRET ?? '').trim();
  if (!jwtSecret) {
    throw new Error('JWT_ACCESS_SECRET is required in production.');
  }
  if (jwtSecret.length < 32 || WEAK_SECRET_MARKERS.some((marker) => jwtSecret.toLowerCase().includes(marker))) {
    throw new Error('JWT_ACCESS_SECRET is missing or too weak for production.');
  }

  const corsOrigin = String(env.CORS_ORIGIN ?? '').trim();
  if (!corsOrigin) {
    throw new Error('CORS_ORIGIN is required in production.');
  }

  const origins = corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0 || origins.every(isLocalhostOrigin)) {
    throw new Error('CORS_ORIGIN cannot be localhost-only in production.');
  }

  return env;
}

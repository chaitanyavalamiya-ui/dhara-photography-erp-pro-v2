export const LOCAL_DEV_API_BASE_URL = 'http://localhost:3000/api/v1';

export function isUnsafeProductionApiUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost')
    );
  } catch {
    return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value);
  }
}

export function resolveApiBaseUrl(env: {
  PROD?: boolean;
  MODE?: string;
  VITE_API_BASE_URL?: string;
}): string {
  const configured = env.VITE_API_BASE_URL?.trim();
  const isProduction = env.PROD === true || env.MODE === 'production';

  if (isProduction) {
    if (!configured) {
      throw new Error('VITE_API_BASE_URL is required in production.');
    }
    if (isUnsafeProductionApiUrl(configured)) {
      throw new Error('VITE_API_BASE_URL cannot point to localhost in production.');
    }
    return configured;
  }

  return configured || LOCAL_DEV_API_BASE_URL;
}

export function assertProductionApiBaseUrl(value: string | undefined): void {
  resolveApiBaseUrl({ PROD: true, MODE: 'production', VITE_API_BASE_URL: value });
}

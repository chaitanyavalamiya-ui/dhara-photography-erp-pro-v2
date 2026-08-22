import { describe, expect, it } from 'vitest';
import {
  LOCAL_DEV_API_PROXY_PATH,
  assertProductionApiBaseUrl,
  resolveApiBaseUrl,
} from './api-base-url';

describe('resolveApiBaseUrl', () => {
  it('falls back to the Vite proxy path in development when VITE_API_BASE_URL is missing', () => {
    expect(resolveApiBaseUrl({ MODE: 'development' })).toBe(LOCAL_DEV_API_PROXY_PATH);
  });

  it('uses the Vite proxy path when VITE_API_BASE_URL points at the local API', () => {
    expect(
      resolveApiBaseUrl({
        MODE: 'development',
        VITE_API_BASE_URL: 'http://localhost:3000/api/v1',
      }),
    ).toBe(LOCAL_DEV_API_PROXY_PATH);
    expect(
      resolveApiBaseUrl({
        MODE: 'development',
        VITE_API_BASE_URL: 'http://127.0.0.1:3000/api/v1',
      }),
    ).toBe(LOCAL_DEV_API_PROXY_PATH);
  });

  it('uses a non-default configured URL in development', () => {
    expect(
      resolveApiBaseUrl({ MODE: 'development', VITE_API_BASE_URL: 'http://localhost:4000/api/v1' }),
    ).toBe('http://localhost:4000/api/v1');
  });

  it('throws in production when VITE_API_BASE_URL is missing', () => {
    expect(() => resolveApiBaseUrl({ PROD: true, MODE: 'production' })).toThrow(
      'VITE_API_BASE_URL is required in production.',
    );
  });

  it('throws in production when the API URL is localhost', () => {
    expect(() =>
      resolveApiBaseUrl({
        PROD: true,
        MODE: 'production',
        VITE_API_BASE_URL: 'http://localhost:3000/api/v1',
      }),
    ).toThrow('VITE_API_BASE_URL cannot point to localhost in production.');
  });

  it('accepts a non-localhost production URL', () => {
    expect(
      resolveApiBaseUrl({
        PROD: true,
        MODE: 'production',
        VITE_API_BASE_URL: 'https://erp.example.com/api/v1',
      }),
    ).toBe('https://erp.example.com/api/v1');
  });
});

describe('assertProductionApiBaseUrl', () => {
  it('fails fast for an empty production API URL', () => {
    expect(() => assertProductionApiBaseUrl(undefined)).toThrow(
      'VITE_API_BASE_URL is required in production.',
    );
  });
});

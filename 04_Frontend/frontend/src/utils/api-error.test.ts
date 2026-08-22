import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { getLoginErrorMessage } from './api-error';

function axiosError(status: number, data: Record<string, unknown>) {
  return new AxiosError('Request failed', String(status), undefined, undefined, {
    status,
    data,
    statusText: 'Error',
    headers: {},
    config: {} as never,
  });
}

describe('getLoginErrorMessage', () => {
  it('explains when the ERP API cannot be reached', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');
    expect(getLoginErrorMessage(error)).toBe(
      'Cannot reach the ERP API. Confirm the backend is running on the configured API URL.',
    );
  });

  it('explains when the Vite proxy returns 500 because the API is down', () => {
    const error = axiosError(500, { message: 'ECONNREFUSED' });
    expect(getLoginErrorMessage(error)).toBe(
      'Cannot reach the ERP API. Confirm the backend is running on the configured API URL.',
    );
  });

  it('shows a generic message for invalid credentials', () => {
    const error = axiosError(401, {
      success: false,
      message: 'Invalid email or password.',
      code: 'INVALID_CREDENTIALS',
    });
    expect(getLoginErrorMessage(error)).toBe('Invalid email or password.');
  });

  it('shows the lock message when ACCOUNT_LOCKED is returned after a valid password', () => {
    const error = axiosError(401, {
      success: false,
      message: 'Account temporarily locked. Try again in 15 minute(s).',
      code: 'ACCOUNT_LOCKED',
      retryAfterSeconds: 900,
    });
    expect(getLoginErrorMessage(error)).toContain('Account temporarily locked');
  });

  it('shows rate-limit UX for TOO_MANY_REQUESTS', () => {
    const error = axiosError(429, {
      success: false,
      message: 'Too many requests. Please try again later.',
      code: 'TOO_MANY_REQUESTS',
      retryAfterSeconds: 900,
    });
    expect(getLoginErrorMessage(error)).toBe(
      'Too many login attempts. Try again in 15 minute(s).',
    );
  });
});

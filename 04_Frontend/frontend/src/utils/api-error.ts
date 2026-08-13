import { AxiosError } from 'axios';
import { ApiError } from '@/services/api-client';

function getApiErrorBody(error: unknown): ApiError | undefined {
  if (error instanceof AxiosError) {
    return error.response?.data as ApiError | undefined;
  }
  return undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const data = getApiErrorBody(error);
  if (data?.errors?.length) {
    return `${data.message}: ${data.errors.join(', ')}`;
  }
  if (data?.message) {
    return data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function getApiErrorCode(error: unknown): string | undefined {
  return getApiErrorBody(error)?.code;
}

export function getApiRetryAfterSeconds(error: unknown): number | undefined {
  const value = getApiErrorBody(error)?.retryAfterSeconds;
  return typeof value === 'number' && value > 0 ? value : undefined;
}

export function getLoginErrorMessage(error: unknown): string {
  const code = getApiErrorCode(error);
  const retryAfterSeconds = getApiRetryAfterSeconds(error);
  const apiMessage = getApiErrorMessage(error, 'Invalid email or password.');

  if (code === 'TOO_MANY_REQUESTS') {
    if (retryAfterSeconds) {
      const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
      return `Too many login attempts. Try again in ${minutes} minute(s).`;
    }
    return 'Too many login attempts. Please try again later.';
  }

  if (code === 'ACCOUNT_LOCKED') {
    return apiMessage;
  }

  return 'Invalid email or password.';
}

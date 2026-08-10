import { AxiosError } from 'axios';
import { ApiError } from '@/services/api-client';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.errors?.length) {
      return `${data.message}: ${data.errors.join(', ')}`;
    }
    if (data?.message) {
      return data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

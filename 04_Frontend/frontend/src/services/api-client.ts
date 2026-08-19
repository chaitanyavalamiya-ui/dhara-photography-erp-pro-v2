import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { resolveApiBaseUrl } from '@/config/api-base-url';
import { useAuthStore } from '@/stores/auth-store';
import { rememberPostLoginPath } from '@/utils/post-login-path';

const API_BASE_URL = resolveApiBaseUrl(import.meta.env);

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

interface AuthTokensPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

let refreshPromise: Promise<string> | null = null;

function redirectToLogin() {
  if (window.location.pathname === '/login') {
    return;
  }

  rememberPostLoginPath(window.location.pathname, window.location.search);
  window.location.assign('/login');
}

function clearSession() {
  useAuthStore.getState().clearAuth();
  redirectToLogin();
}

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, updateTokens } = useAuthStore.getState();

  if (!refreshToken) {
    throw new Error('Missing refresh token.');
  }

  const { data } = await axios.post<ApiResponse<AuthTokensPayload>>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
  );

  updateTokens(data.data.accessToken, data.data.refreshToken);
  return data.data.accessToken;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const request = error.config as RetryableRequest | undefined;
    if (!request) {
      return Promise.reject(error);
    }

    const requestUrl = request.url ?? '';

    if (requestUrl.includes('/auth/login')) {
      return Promise.reject(error);
    }

    if (requestUrl.includes('/auth/refresh') || requestUrl.includes('/auth/logout')) {
      clearSession();
      return Promise.reject(error);
    }

    if (request._retry) {
      clearSession();
      return Promise.reject(error);
    }

    request._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const accessToken = await refreshPromise;
      request.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(request);
    } catch {
      clearSession();
      return Promise.reject(error);
    }
  },
);

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  code?: string;
  retryAfterSeconds?: number;
}

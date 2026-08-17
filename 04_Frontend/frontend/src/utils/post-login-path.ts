export const POST_LOGIN_STORAGE_KEY = 'dhara-post-login-path';

export function resolvePostLoginPath(from?: { pathname?: string; search?: string }): string {
  const pathname = from?.pathname ?? '';
  const search = from?.search ?? '';

  if (
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname === '/login' ||
    pathname.includes('\\') ||
    pathname.includes('://')
  ) {
    return '/dashboard';
  }

  return `${pathname}${search}`;
}

export function rememberPostLoginPath(pathname: string, search = ''): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  const path = resolvePostLoginPath({ pathname, search });
  if (path === '/dashboard') {
    sessionStorage.removeItem(POST_LOGIN_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(POST_LOGIN_STORAGE_KEY, path);
}

export function peekRememberedPostLoginPath(): { pathname: string; search: string } | undefined {
  if (typeof sessionStorage === 'undefined') {
    return undefined;
  }

  const raw = sessionStorage.getItem(POST_LOGIN_STORAGE_KEY);
  if (!raw) {
    return undefined;
  }

  const queryIndex = raw.indexOf('?');
  if (queryIndex === -1) {
    return { pathname: raw, search: '' };
  }

  return {
    pathname: raw.slice(0, queryIndex),
    search: raw.slice(queryIndex),
  };
}

export function clearRememberedPostLoginPath(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(POST_LOGIN_STORAGE_KEY);
}

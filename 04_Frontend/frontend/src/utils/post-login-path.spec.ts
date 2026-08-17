import { describe, expect, it } from 'vitest';
import {
  resolvePostLoginPath,
  rememberPostLoginPath,
  peekRememberedPostLoginPath,
  clearRememberedPostLoginPath,
} from './post-login-path';

describe('resolvePostLoginPath', () => {
  it('restores a safe deep-link and rejects open redirects', () => {
    expect(resolvePostLoginPath({ pathname: '/expenses', search: '?q=fuel' })).toBe(
      '/expenses?q=fuel',
    );
    expect(resolvePostLoginPath({ pathname: '//evil.example' })).toBe('/dashboard');
    expect(resolvePostLoginPath({ pathname: 'https://evil.example' })).toBe('/dashboard');
    expect(resolvePostLoginPath({ pathname: '/login' })).toBe('/dashboard');
    expect(resolvePostLoginPath()).toBe('/dashboard');
  });

  it('remembers and peeks a safe return path', () => {
    rememberPostLoginPath('/invoices', '?id=1');
    expect(peekRememberedPostLoginPath()).toEqual({
      pathname: '/invoices',
      search: '?id=1',
    });
    clearRememberedPostLoginPath();
    expect(peekRememberedPostLoginPath()).toBeUndefined();
  });
});

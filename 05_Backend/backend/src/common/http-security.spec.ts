import {
  createHelmetOptions,
  isCorsOriginAllowed,
  parseCorsOrigins,
  payloadContainsPrototypePollution,
} from './http-security';

describe('http-security', () => {
  it('parses comma-separated CORS origins from env', () => {
    expect(parseCorsOrigins('http://localhost:5173, http://localhost:5174')).toEqual([
      'http://localhost:5173',
      'http://localhost:5174',
    ]);
  });

  it('allows listed origins and same-origin requests without an Origin header', () => {
    const allowed = parseCorsOrigins('http://localhost:5173');
    expect(isCorsOriginAllowed(undefined, allowed)).toBe(true);
    expect(isCorsOriginAllowed('http://localhost:5173', allowed)).toBe(true);
    expect(isCorsOriginAllowed('https://evil.example', allowed)).toBe(false);
  });

  it('keeps Helmet compatible with cross-origin authenticated image fetches', () => {
    const options = createHelmetOptions();
    expect(options.crossOriginResourcePolicy).toEqual({ policy: 'cross-origin' });
    expect(options.crossOriginEmbedderPolicy).toBe(false);
    expect(options.contentSecurityPolicy).toBe(false);
  });

  it('detects prototype-pollution style keys in nested payloads', () => {
    expect(payloadContainsPrototypePollution({ name: 'ok' })).toBe(false);
    expect(payloadContainsPrototypePollution(JSON.parse('{"__proto__":{"admin":true}}'))).toBe(true);
    expect(payloadContainsPrototypePollution(JSON.parse('{"nested":{"constructor":{"prototype":{}}}}'))).toBe(
      true,
    );
  });
});

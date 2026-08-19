import { validateProductionEnv } from './production-env';

const strongSecret = 'a'.repeat(32);

describe('validateProductionEnv', () => {
  it('skips checks outside production', () => {
    expect(validateProductionEnv({ NODE_ENV: 'development' })).toEqual({ NODE_ENV: 'development' });
  });

  it('requires DATABASE_URL in production', () => {
    expect(() =>
      validateProductionEnv({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: strongSecret,
        CORS_ORIGIN: 'https://erp.example.com',
      }),
    ).toThrow('DATABASE_URL is required in production.');
  });

  it('rejects a missing or weak JWT secret in production', () => {
    expect(() =>
      validateProductionEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://db',
        JWT_ACCESS_SECRET: 'change_me',
        CORS_ORIGIN: 'https://erp.example.com',
      }),
    ).toThrow('JWT_ACCESS_SECRET is missing or too weak for production.');
  });

  it('rejects localhost-only CORS in production', () => {
    expect(() =>
      validateProductionEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://db',
        JWT_ACCESS_SECRET: strongSecret,
        CORS_ORIGIN: 'http://localhost:5173',
      }),
    ).toThrow('CORS_ORIGIN cannot be localhost-only in production.');
  });

  it('accepts a complete production configuration', () => {
    const env = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://db',
      JWT_ACCESS_SECRET: strongSecret,
      CORS_ORIGIN: 'https://erp.example.com',
    };
    expect(validateProductionEnv(env)).toEqual(env);
  });
});

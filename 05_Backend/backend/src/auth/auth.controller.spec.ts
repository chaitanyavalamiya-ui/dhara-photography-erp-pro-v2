import { readFileSync } from 'fs';
import { join } from 'path';

describe('AuthController rate limiting', () => {
  const source = readFileSync(join(__dirname, 'auth.controller.ts'), 'utf8');

  it('does not hardcode conflicting @Throttle limits', () => {
    expect(source).not.toContain('@Throttle(');
    expect(source).not.toContain('@nestjs/throttler');
    expect(source).toContain("@AuthRateLimit('login')");
    expect(source).toContain("@AuthRateLimit('refresh')");
  });
});

import {
  assertPasswordPolicy,
  formatPasswordPolicyErrors,
  getPasswordPolicyErrors,
  isPasswordPolicyValid,
} from './password-policy.util';

describe('password-policy.util', () => {
  it('accepts a valid password', () => {
    expect(isPasswordPolicyValid('SecurePass1')).toBe(true);
    expect(getPasswordPolicyErrors('SecurePass1')).toEqual([]);
    expect(formatPasswordPolicyErrors('SecurePass1')).toBe('');
    expect(() => assertPasswordPolicy('SecurePass1')).not.toThrow();
  });

  it('rejects a password that is too short', () => {
    expect(getPasswordPolicyErrors('Ab1')).toContain('TOO_SHORT');
    expect(formatPasswordPolicyErrors('Ab1')).toBe('Password must be at least 8 characters.');
    expect(() => assertPasswordPolicy('Ab1')).toThrow('Password must be at least 8 characters.');
  });

  it('rejects a password missing uppercase', () => {
    expect(getPasswordPolicyErrors('securepass1')).toContain('MISSING_UPPERCASE');
    expect(formatPasswordPolicyErrors('securepass1')).toBe(
      'Password must include at least one uppercase letter.',
    );
  });

  it('rejects a password missing lowercase', () => {
    expect(getPasswordPolicyErrors('SECUREPASS1')).toContain('MISSING_LOWERCASE');
    expect(formatPasswordPolicyErrors('SECUREPASS1')).toBe(
      'Password must include at least one lowercase letter.',
    );
  });

  it('rejects a password missing number', () => {
    expect(getPasswordPolicyErrors('SecurePass')).toContain('MISSING_NUMBER');
    expect(formatPasswordPolicyErrors('SecurePass')).toBe(
      'Password must include at least one number.',
    );
  });
});

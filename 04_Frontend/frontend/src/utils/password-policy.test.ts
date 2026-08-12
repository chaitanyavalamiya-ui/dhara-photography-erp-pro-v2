import { describe, expect, it } from 'vitest';
import {
  getPasswordPolicyError,
  PASSWORD_POLICY_MESSAGES,
  validatePasswordPolicy,
} from './password-policy';

describe('password-policy', () => {
  it('accepts a valid password', () => {
    expect(getPasswordPolicyError('SecurePass1')).toBeNull();
    expect(validatePasswordPolicy('SecurePass1')).toBeNull();
  });

  it('rejects a password that is too short', () => {
    expect(getPasswordPolicyError('Ab1')).toBe('TOO_SHORT');
    expect(validatePasswordPolicy('Ab1')).toBe(PASSWORD_POLICY_MESSAGES.TOO_SHORT);
  });

  it('rejects a password missing uppercase', () => {
    expect(getPasswordPolicyError('securepass1')).toBe('MISSING_UPPERCASE');
  });

  it('rejects a password missing lowercase', () => {
    expect(getPasswordPolicyError('SECUREPASS1')).toBe('MISSING_LOWERCASE');
  });

  it('rejects a password missing number', () => {
    expect(getPasswordPolicyError('SecurePass')).toBe('MISSING_NUMBER');
  });
});

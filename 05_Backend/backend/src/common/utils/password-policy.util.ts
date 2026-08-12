import { BadRequestException } from '@nestjs/common';

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordPolicyErrorCode =
  | 'TOO_SHORT'
  | 'MISSING_UPPERCASE'
  | 'MISSING_LOWERCASE'
  | 'MISSING_NUMBER';

const POLICY_MESSAGES: Record<PasswordPolicyErrorCode, string> = {
  TOO_SHORT: 'Password must be at least 8 characters.',
  MISSING_UPPERCASE: 'Password must include at least one uppercase letter.',
  MISSING_LOWERCASE: 'Password must include at least one lowercase letter.',
  MISSING_NUMBER: 'Password must include at least one number.',
};

export function getPasswordPolicyErrors(password: string): PasswordPolicyErrorCode[] {
  const errors: PasswordPolicyErrorCode[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push('TOO_SHORT');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('MISSING_UPPERCASE');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('MISSING_LOWERCASE');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('MISSING_NUMBER');
  }

  return errors;
}

export function getPasswordPolicyMessage(code: PasswordPolicyErrorCode): string {
  return POLICY_MESSAGES[code];
}

export function formatPasswordPolicyErrors(password: string): string {
  const errors = getPasswordPolicyErrors(password);
  if (errors.length === 0) {
    return '';
  }

  return getPasswordPolicyMessage(errors[0]);
}

export function isPasswordPolicyValid(password: string): boolean {
  return getPasswordPolicyErrors(password).length === 0;
}

export function assertPasswordPolicy(password: string): void {
  const message = formatPasswordPolicyErrors(password);
  if (message) {
    throw new BadRequestException(message);
  }
}

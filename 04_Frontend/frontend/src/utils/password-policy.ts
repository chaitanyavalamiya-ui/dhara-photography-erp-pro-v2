export const PASSWORD_POLICY_MESSAGES = {
  TOO_SHORT: 'Minimum 8 characters required. / ઓછામાં ઓછા 8 અક્ષરો જરૂરી.',
  MISSING_UPPERCASE: 'Uppercase letter required. / એક મોટા અક્ષરની જરૂર છે.',
  MISSING_LOWERCASE: 'Lowercase letter required. / એક નાના અક્ષરની જરૂર છે.',
  MISSING_NUMBER: 'Number required. / એક નંબરની જરૂર છે.',
  MISMATCH: 'Passwords do not match. / પાસવર્ડ મેળ ખાતા નથી.',
  CURRENT_INCORRECT: 'Current password is incorrect. / વર્તમાન પાસવર્ડ ખોટો છે.',
  SUCCESS: 'Password changed successfully. / પાસવર્ડ સફળતાપૂર્વક બદલાયો.',
} as const;

export type PasswordPolicyErrorCode = keyof typeof PASSWORD_POLICY_MESSAGES;

export function getPasswordPolicyError(password: string): PasswordPolicyErrorCode | null {
  if (password.length < 8) {
    return 'TOO_SHORT';
  }
  if (!/[A-Z]/.test(password)) {
    return 'MISSING_UPPERCASE';
  }
  if (!/[a-z]/.test(password)) {
    return 'MISSING_LOWERCASE';
  }
  if (!/[0-9]/.test(password)) {
    return 'MISSING_NUMBER';
  }

  return null;
}

export function validatePasswordPolicy(password: string): string | null {
  const code = getPasswordPolicyError(password);
  return code ? PASSWORD_POLICY_MESSAGES[code] : null;
}

export function passwordPolicyRefinement(password: string): boolean {
  return getPasswordPolicyError(password) === null;
}

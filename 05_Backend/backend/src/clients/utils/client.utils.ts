import { BadRequestException } from '@nestjs/common';

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export function normalizeIndianMobile(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }

  if (digits.length === 10) {
    return digits;
  }

  throw new BadRequestException('Enter a valid Indian mobile number (10 digits starting with 6-9).');
}

export function validateIndianMobile(value: string): void {
  const normalized = normalizeIndianMobile(value);

  if (!INDIAN_MOBILE_REGEX.test(normalized)) {
    throw new BadRequestException('Enter a valid Indian mobile number (10 digits starting with 6-9).');
  }
}

export function normalizeEmail(email?: string | null): string | null {
  if (!email) {
    return null;
  }

  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOptionalDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Enter a valid date.');
  }

  return date;
}

export function toDateOnlyString(value?: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}

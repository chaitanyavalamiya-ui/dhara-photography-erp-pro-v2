import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function allocateNextClientNumber(latestNumber?: string | null): string {
  const match = latestNumber?.match(/^CLT-(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `CLT-${String(next).padStart(6, '0')}`;
}

function uniqueTargetHaystack(error: Prisma.PrismaClientKnownRequestError): string {
  const target = error.meta?.target;
  return Array.isArray(target) ? target.join(',') : String(target ?? '');
}

export function isClientNumberUniqueConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const haystack = uniqueTargetHaystack(error);
  return /client[_]?number/i.test(haystack) || haystack.includes('company_id_client_number');
}

export function isClientMobileUniqueConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const haystack = uniqueTargetHaystack(error);
  return /normalized[_]?mobile/i.test(haystack) || haystack.includes('company_id_normalized_mobile');
}

import { z } from 'zod';

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'Enter a valid email address',
  });

const indianMobile = z
  .string()
  .trim()
  .min(1, 'Mobile number is required')
  .refine((value) => {
    const digits = value.replace(/\D/g, '');
    const normalized =
      digits.length === 12 && digits.startsWith('91')
        ? digits.slice(2)
        : digits.length === 11 && digits.startsWith('0')
          ? digits.slice(1)
          : digits;
    return /^[6-9]\d{9}$/.test(normalized);
  }, 'Enter a valid Indian mobile number');

const optionalIndianMobile = z
  .string()
  .trim()
  .optional()
  .refine((value) => {
    if (!value) return true;
    const digits = value.replace(/\D/g, '');
    const normalized =
      digits.length === 12 && digits.startsWith('91')
        ? digits.slice(2)
        : digits.length === 11 && digits.startsWith('0')
          ? digits.slice(1)
          : digits;
    return /^[6-9]\d{9}$/.test(normalized);
  }, 'Enter a valid Indian mobile number');

const optionalDate = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
    message: 'Enter a valid date',
  });

export const clientFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Client name is required').max(200),
  mobile: indianMobile,
  whatsapp: optionalIndianMobile,
  email: optionalEmail,
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  dateOfBirth: optionalDate,
  anniversaryDate: optionalDate,
  notes: z.string().trim().max(2000).optional(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

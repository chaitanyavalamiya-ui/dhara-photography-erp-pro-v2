import { z } from 'zod';
import { STAFF_ROLES, PAYMENT_TYPES } from './staff-form';

const roleCodes = STAFF_ROLES.map((role) => role.code) as [string, ...string[]];
const paymentCodes = PAYMENT_TYPES.map((type) => type.code) as [string, ...string[]];

export const staffFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(200),
  mobile: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[6-9]\d{9}$/.test(value.replace(/\D/g, '').slice(-10)), {
      message: 'Enter a valid 10-digit mobile number',
    }),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().trim().max(500).optional(),
  role: z.enum(roleCodes, { message: 'Select a role' }),
  joiningDate: z.string().optional(),
  paymentType: z.enum(paymentCodes).default('per_event'),
  defaultRate: z.coerce.number().min(0, 'Rate cannot be negative').default(0),
  notes: z.string().trim().max(2000).optional(),
  isActive: z.boolean().default(true),
});

export type StaffFormValues = z.infer<typeof staffFormSchema>;

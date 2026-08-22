import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { bookingsService } from '@/services/bookings-service';
import {
  Expense,
  STAFF_PAYMENT_METHOD_OPTIONS,
} from '@/services/expenses-service';
import { staffService } from '@/services/staff-service';
import { getApiErrorMessage } from '@/utils/api-error';
import { todayIso } from '@/utils/studio-date';
import '@/pages/accounts/accounts-page.css';

const schema = z.object({
  staffId: z.string().min(1, 'Select staff'),
  bookingId: z.string().optional(),
  amount: z.number({ invalid_type_error: 'Enter amount' }).positive('Amount must be positive'),
  paymentDate: z.string().min(1, 'Select date'),
  paymentModeCode: z.enum(['cash', 'upi', 'bank_transfer', 'other'], {
    errorMap: () => ({ message: 'Select payment method' }),
  }),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type StaffPaymentFormValues = z.infer<typeof schema>;

interface AddStaffPaymentModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  expense?: Expense | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: StaffPaymentFormValues) => void;
}

function toFormValues(expense?: Expense | null): StaffPaymentFormValues {
  if (expense) {
    const method = STAFF_PAYMENT_METHOD_OPTIONS.some(
      (option) => option.value === expense.paymentModeCode,
    )
      ? (expense.paymentModeCode as StaffPaymentFormValues['paymentModeCode'])
      : 'cash';

    return {
      staffId: expense.staffId ?? '',
      bookingId: expense.bookingId ?? '',
      amount: expense.amount,
      paymentDate: expense.expenseDate,
      paymentModeCode: method,
      referenceNumber: expense.referenceNumber ?? '',
      notes: expense.notes ?? '',
    };
  }

  return {
    staffId: '',
    bookingId: '',
    amount: undefined as unknown as number,
    paymentDate: todayIso(),
    paymentModeCode: 'upi',
    referenceNumber: '',
    notes: '',
  };
}

export function AddStaffPaymentModal({
  open,
  mode = 'create',
  expense,
  isSubmitting,
  onClose,
  onSubmit,
}: AddStaffPaymentModalProps) {
  const isEdit = mode === 'edit';

  const staffQuery = useQuery({
    queryKey: ['staff', 'active-select'],
    queryFn: () =>
      staffService.list({
        status: 'active',
        limit: 100,
        sortBy: 'fullName',
        sortOrder: 'asc',
      }),
    enabled: open,
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'staff-payment-select'],
    queryFn: () => bookingsService.list({ limit: 50 }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffPaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(expense),
  });

  useEffect(() => {
    if (open) {
      reset(toFormValues(isEdit ? expense : null));
    }
  }, [open, isEdit, expense, reset]);

  if (!open) return null;

  const staffItems = staffQuery.data?.items ?? [];
  const bookings = bookingsQuery.data?.items ?? [];

  return (
    <div className="dhara-acc dhara-acc-modal">
      <div className="dhara-acc-modal-card">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2>{isEdit ? 'Edit Staff Payment' : 'Add Staff Payment'}</h2>
            <p className="dhara-acc-modal-sub">
              {isEdit
                ? 'Update this staff payment expense'
                : 'Record a staff payment as one expense ledger entry'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="dhara-acc-icon-btn" aria-label="Close">
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="dhara-acc-form">
          <div>
            <label>Staff</label>
            <select className="input-field" {...register('staffId')}>
              <option value="">
                {staffQuery.isLoading ? 'Loading staff...' : 'Select staff...'}
              </option>
              {staffItems.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName} ({member.staffCode})
                </option>
              ))}
            </select>
            {staffQuery.isError && (
              <p className="dhara-acc-err">
                {getApiErrorMessage(staffQuery.error, 'Failed to load staff.')}
              </p>
            )}
            {errors.staffId && <p className="dhara-acc-err">{errors.staffId.message}</p>}
          </div>

          <div>
            <label>Booking (optional)</label>
            <select className="input-field" {...register('bookingId')}>
              <option value="">No booking</option>
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.bookingNumber} — {booking.client.fullName}
                </option>
              ))}
            </select>
            {bookingsQuery.isError && (
              <p className="dhara-acc-err">
                {getApiErrorMessage(bookingsQuery.error, 'Failed to load bookings.')}
              </p>
            )}
          </div>

          <div>
            <label>Amount (₹)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="input-field"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="dhara-acc-err">{errors.amount.message}</p>}
          </div>

          <div>
            <label>Payment Date</label>
            <input type="date" className="input-field" {...register('paymentDate')} />
            {errors.paymentDate && <p className="dhara-acc-err">{errors.paymentDate.message}</p>}
          </div>

          <div>
            <label>Payment Method</label>
            <select className="input-field" {...register('paymentModeCode')}>
              {STAFF_PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.paymentModeCode && (
              <p className="dhara-acc-err">{errors.paymentModeCode.message}</p>
            )}
          </div>

          <div>
            <label>Reference Number</label>
            <input className="input-field" {...register('referenceNumber')} />
          </div>

          <div>
            <label>Notes</label>
            <textarea rows={2} className="input-field resize-none" {...register('notes')} />
          </div>

          <div className="dhara-acc-form-actions">
            <button type="button" className="dhara-acc-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="dhara-acc-btn is-gold"
              disabled={isSubmitting || staffQuery.isLoading || staffItems.length === 0}
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Record Staff Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

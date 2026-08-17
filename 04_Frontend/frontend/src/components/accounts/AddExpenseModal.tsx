import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { bookingsService } from '@/services/bookings-service';
import { useMasterDataOptions } from '@/hooks/use-master-data-options';
import {
  Expense,
  getExpenseSource,
  getExpenseSourceDescription,
  getExpenseSourceLabel,
  isSystemLinkedExpense,
} from '@/services/expenses-service';

const schema = z.object({
  categoryCode: z.string().min(1, 'Select category'),
  amount: z.number({ invalid_type_error: 'Enter amount' }).positive('Amount must be positive'),
  expenseDate: z.string().min(1, 'Select date'),
  description: z.string().optional(),
  vendorPerson: z.string().optional(),
  paymentModeCode: z.string().optional(),
  referenceNumber: z.string().optional(),
  bookingId: z.string().optional(),
  notes: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof schema>;

interface AddExpenseModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  expense?: Expense | null;
  isSubmitting?: boolean;
  prefillBookingId?: string;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => void;
}

function toFormValues(expense?: Expense | null, prefillBookingId?: string): ExpenseFormValues {
  if (expense) {
    return {
      categoryCode: expense.categoryCode,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      description: expense.description ?? '',
      vendorPerson: expense.vendorPerson ?? '',
      paymentModeCode: expense.paymentModeCode ?? '',
      referenceNumber: expense.referenceNumber ?? '',
      bookingId: expense.bookingId ?? '',
      notes: expense.notes ?? '',
    };
  }

  return {
    expenseDate: new Date().toISOString().slice(0, 10),
    categoryCode: 'other',
    bookingId: prefillBookingId ?? '',
    amount: undefined as unknown as number,
    description: '',
    vendorPerson: '',
    paymentModeCode: 'cash',
    referenceNumber: '',
    notes: '',
  };
}

export function AddExpenseModal({
  open,
  mode = 'create',
  expense,
  isSubmitting,
  prefillBookingId,
  onClose,
  onSubmit,
}: AddExpenseModalProps) {
  const isEdit = mode === 'edit';
  const locked = isEdit && expense ? isSystemLinkedExpense(expense) : false;

  const categoryOptions = useMasterDataOptions('expense_category');
  const paymentModeOptions = useMasterDataOptions('payment_mode');

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'expense-select'],
    queryFn: () => bookingsService.list({ limit: 50 }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(expense, prefillBookingId),
  });

  useEffect(() => {
    if (open) {
      reset(toFormValues(isEdit ? expense : null, prefillBookingId));
    }
  }, [open, isEdit, expense, prefillBookingId, reset]);

  if (!open) return null;

  const sourceDescription = expense ? getExpenseSourceDescription(getExpenseSource(expense)) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[90vh] w-full max-w-md overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">
              {isEdit ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {isEdit ? 'Update expense details' : 'Record a studio expense'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:text-gold"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {locked && expense && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            <p className="font-medium">{getExpenseSourceLabel(getExpenseSource(expense))}</p>
            <p className="mt-1 text-xs text-amber-100/80">{sourceDescription}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={locked} className="space-y-4 disabled:opacity-60">
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Category</label>
              <select className="input-field" {...register('categoryCode')}>
                {categoryOptions.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.categoryCode && (
                <p className="mt-1 text-xs text-red-400">{errors.categoryCode.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Amount (₹)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input-field"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-red-400">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Date</label>
              <input type="date" className="input-field" {...register('expenseDate')} />
              {errors.expenseDate && (
                <p className="mt-1 text-xs text-red-400">{errors.expenseDate.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Description</label>
              <input className="input-field" {...register('description')} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Vendor / Person</label>
              <input className="input-field" {...register('vendorPerson')} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Link to Booking</label>
              <select className="input-field" {...register('bookingId')}>
                <option value="">None</option>
                {(bookingsQuery.data?.items ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bookingNumber} — {b.client.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Payment Method</label>
              <select className="input-field" {...register('paymentModeCode')}>
                <option value="">None</option>
                {paymentModeOptions.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Receipt / Reference</label>
              <input
                className="input-field"
                placeholder="Bill no., UTR, or receipt number"
                {...register('referenceNumber')}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Notes</label>
              <textarea rows={2} className="input-field resize-none" {...register('notes')} />
            </div>
          </fieldset>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {locked ? 'Close' : 'Cancel'}
            </button>
            {!locked && (
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Expense'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

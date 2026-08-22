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
import '@/pages/expenses/expenses-page.css';

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
    <div className="dhara-exp dhara-exp-modal">
      <div className="dhara-exp-modal-card">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2>{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
            <p className="dhara-exp-modal-sub">
              {isEdit ? 'Update expense details' : 'Record a studio expense'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="dhara-exp-icon-btn" aria-label="Close">
            <X />
          </button>
        </div>

        {locked && expense && (
          <div className="dhara-exp-flash is-bad" style={{ marginBottom: '1rem' }}>
            <p>{getExpenseSourceLabel(getExpenseSource(expense))}</p>
            <p className="dhara-exp-note" style={{ margin: '0.35rem 0 0' }}>
              {sourceDescription}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="dhara-exp-form">
          <fieldset disabled={locked} className="space-y-4 disabled:opacity-60">
            <div>
              <label>Category</label>
              <select className="input-field" {...register('categoryCode')}>
                {categoryOptions.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.categoryCode && (
                <p className="dhara-exp-err">{errors.categoryCode.message}</p>
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
              {errors.amount && <p className="dhara-exp-err">{errors.amount.message}</p>}
            </div>

            <div>
              <label>Date</label>
              <input type="date" className="input-field" {...register('expenseDate')} />
              {errors.expenseDate && <p className="dhara-exp-err">{errors.expenseDate.message}</p>}
            </div>

            <div>
              <label>Description</label>
              <input className="input-field" {...register('description')} />
            </div>

            <div>
              <label>Vendor / Person</label>
              <input className="input-field" {...register('vendorPerson')} />
            </div>

            <div>
              <label>Link to Booking</label>
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
              <label>Payment Method</label>
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
              <label>Receipt / Reference</label>
              <input
                className="input-field"
                placeholder="Bill no., UTR, or receipt number"
                {...register('referenceNumber')}
              />
            </div>

            <div>
              <label>Notes</label>
              <textarea rows={2} className="input-field resize-none" {...register('notes')} />
            </div>
          </fieldset>

          <div className="dhara-exp-form-actions">
            <button type="button" className="dhara-exp-btn" onClick={onClose}>
              {locked ? 'Close' : 'Cancel'}
            </button>
            {!locked && (
              <button type="submit" className="dhara-exp-btn is-gold" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Expense'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

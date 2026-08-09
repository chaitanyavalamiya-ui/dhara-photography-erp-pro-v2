import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { bookingsService } from '@/services/bookings-service';
import { EXPENSE_CATEGORY_OPTIONS } from '@/services/expenses-service';
import { PAYMENT_METHOD_OPTIONS } from '@/services/payments-service';

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

type FormValues = z.infer<typeof schema>;

interface AddExpenseModalProps {
  open: boolean;
  isSubmitting?: boolean;
  prefillBookingId?: string;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

export function AddExpenseModal({
  open,
  isSubmitting,
  prefillBookingId,
  onClose,
  onSubmit,
}: AddExpenseModalProps) {
  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'expense-select'],
    queryFn: () => bookingsService.list({ limit: 50 }),
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      expenseDate: new Date().toISOString().slice(0, 10),
      categoryCode: 'other',
      bookingId: prefillBookingId ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        expenseDate: new Date().toISOString().slice(0, 10),
        categoryCode: 'other',
        bookingId: prefillBookingId ?? '',
        amount: undefined,
        description: '',
        vendorPerson: '',
        paymentModeCode: 'cash',
        referenceNumber: '',
        notes: '',
      });
    }
  }, [open, prefillBookingId, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[90vh] w-full max-w-md overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">Add Expense</h2>
            <p className="mt-1 text-sm text-gray-400">Record a studio expense</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-gold">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Category</label>
            <select className="input-field" {...register('categoryCode')}>
              {EXPENSE_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Amount (₹)</label>
            <input type="number" min="1" step="1" className="input-field" {...register('amount', { valueAsNumber: true })} />
            {errors.amount && <p className="mt-1 text-xs text-red-400">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Date</label>
            <input type="date" className="input-field" {...register('expenseDate')} />
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
                <option key={b.id} value={b.id}>{b.bookingNumber} — {b.client.fullName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Payment Method</label>
            <select className="input-field" {...register('paymentModeCode')}>
              <option value="">None</option>
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Reference</label>
            <input className="input-field" {...register('referenceNumber')} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Notes</label>
            <textarea rows={2} className="input-field resize-none" {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

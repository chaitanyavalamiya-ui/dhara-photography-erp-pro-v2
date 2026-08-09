import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Invoice } from '@/services/invoices-service';
import { formatCurrency } from '@/utils/booking-form';

const editInvoiceSchema = z.object({
  advanceAmount: z
    .number({ invalid_type_error: 'Enter a valid amount' })
    .min(0, 'Amount cannot be negative'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

type EditInvoiceForm = z.infer<typeof editInvoiceSchema>;

interface EditInvoiceModalProps {
  open: boolean;
  invoice: Invoice | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: EditInvoiceForm) => void;
}

export function EditInvoiceModal({
  open,
  invoice,
  isSubmitting,
  onClose,
  onSubmit,
}: EditInvoiceModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditInvoiceForm>({
    resolver: zodResolver(editInvoiceSchema),
  });

  useEffect(() => {
    if (open && invoice) {
      reset({
        advanceAmount: invoice.advanceAmount,
        dueDate: invoice.dueDate ?? '',
        notes: invoice.notes ?? '',
      });
    }
  }, [open, invoice, reset]);

  if (!open || !invoice) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">Update Invoice</h2>
            <p className="mt-1 text-sm text-gray-400">{invoice.invoiceNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 rounded-lg border border-surface-border bg-surface-elevated p-4 text-sm">
          <div className="grid grid-cols-2 gap-2 text-gray-400">
            <p>Grand Total</p>
            <p className="text-right font-medium text-gray-200">
              {formatCurrency(invoice.totalAmount)}
            </p>
            <p>Current Balance</p>
            <p className="text-right font-medium text-gold">
              {formatCurrency(invoice.balanceAmount)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="advanceAmount" className="mb-1.5 block text-sm font-medium text-gray-300">
              Advance Paid (₹)
            </label>
            <input
              id="advanceAmount"
              type="number"
              min="0"
              step="1"
              className="input-field"
              {...register('advanceAmount', { valueAsNumber: true })}
            />
            {errors.advanceAmount && (
              <p className="mt-1 text-xs text-red-400">{errors.advanceAmount.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="dueDate" className="mb-1.5 block text-sm font-medium text-gray-300">
              Due Date
            </label>
            <input id="dueDate" type="date" className="input-field" {...register('dueDate')} />
          </div>

          <div>
            <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-gray-300">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              className="input-field resize-none"
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

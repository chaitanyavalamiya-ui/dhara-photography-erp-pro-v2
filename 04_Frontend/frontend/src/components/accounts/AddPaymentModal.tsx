import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { invoicesService } from '@/services/invoices-service';
import { PAYMENT_METHOD_OPTIONS } from '@/services/payments-service';
import { formatCurrency } from '@/utils/booking-form';

const schema = z.object({
  invoiceId: z.string().min(1, 'Select an invoice'),
  amount: z.number({ invalid_type_error: 'Enter amount' }).positive('Amount must be positive'),
  paymentModeCode: z.string().min(1, 'Select payment method'),
  paymentDate: z.string().min(1, 'Select date'),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddPaymentModalProps {
  open: boolean;
  isSubmitting?: boolean;
  prefillInvoiceId?: string;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

export function AddPaymentModal({
  open,
  isSubmitting,
  prefillInvoiceId,
  onClose,
  onSubmit,
}: AddPaymentModalProps) {
  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'payment-select'],
    queryFn: () => invoicesService.list({ limit: 50, status: 'all' }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentModeCode: 'upi',
      invoiceId: prefillInvoiceId ?? '',
    },
  });

  const selectedInvoiceId = watch('invoiceId');
  const selectedInvoice = invoicesQuery.data?.items.find((inv) => inv.id === selectedInvoiceId);

  useEffect(() => {
    if (open) {
      reset({
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentModeCode: 'upi',
        invoiceId: prefillInvoiceId ?? '',
        amount: undefined,
        transactionReference: '',
        notes: '',
      });
    }
  }, [open, prefillInvoiceId, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">Record Payment</h2>
            <p className="mt-1 text-sm text-gray-400">Payment against an invoice</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-gold">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Invoice</label>
            <select className="input-field" {...register('invoiceId')}>
              <option value="">Select invoice...</option>
              {(invoicesQuery.data?.items ?? [])
                .filter((inv) => inv.balanceAmount > 0)
                .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.clientName} (Bal: {formatCurrency(inv.balanceAmount)})
                  </option>
                ))}
            </select>
            {errors.invoiceId && <p className="mt-1 text-xs text-red-400">{errors.invoiceId.message}</p>}
          </div>

          {selectedInvoice && (
            <div className="rounded-lg border border-surface-border bg-surface-elevated p-3 text-sm text-gray-400">
              Balance due: <span className="font-semibold text-gold">{formatCurrency(selectedInvoice.balanceAmount)}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Amount (₹)</label>
            <input type="number" min="1" step="1" className="input-field" {...register('amount', { valueAsNumber: true })} />
            {errors.amount && <p className="mt-1 text-xs text-red-400">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Payment Method</label>
            <select className="input-field" {...register('paymentModeCode')}>
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Payment Date</label>
            <input type="date" className="input-field" {...register('paymentDate')} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Reference Number</label>
            <input className="input-field" {...register('transactionReference')} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Notes</label>
            <textarea rows={2} className="input-field resize-none" {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { invoicesService } from '@/services/invoices-service';
import { useMasterDataOptions } from '@/hooks/use-master-data-options';
import { formatCurrency } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';

function getInvoiceBalance(invoice: { balanceAmount: number }) {
  return Number(invoice.balanceAmount) || 0;
}

const baseSchema = z.object({
  invoiceId: z.string().min(1, 'Select an invoice'),
  amount: z.number({ invalid_type_error: 'Enter amount' }).positive('Amount must be positive'),
  paymentModeCode: z.string().min(1, 'Select payment method'),
  paymentDate: z.string().min(1, 'Select date'),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof baseSchema>;

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
  const paymentModeOptions = useMasterDataOptions('payment_mode');

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'payment-select'],
    queryFn: () => invoicesService.list({ limit: 100, status: 'all' }),
    enabled: open,
  });

  const payableInvoices = useMemo(
    () => (invoicesQuery.data?.items ?? []).filter((inv) => getInvoiceBalance(inv) > 0),
    [invoicesQuery.data?.items],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentModeCode: 'upi',
      invoiceId: prefillInvoiceId ?? '',
    },
  });

  const selectedInvoiceId = watch('invoiceId');
  const selectedInvoice = payableInvoices.find((inv) => inv.id === selectedInvoiceId);
  const selectedBalance = selectedInvoice ? getInvoiceBalance(selectedInvoice) : undefined;

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

  const submitPayment = (values: FormValues) => {
    if (selectedBalance !== undefined && values.amount > selectedBalance) {
      setError('amount', {
        message: `Amount cannot exceed ${formatCurrency(selectedBalance)}`,
      });
      return;
    }
    onSubmit(values);
  };

  if (!open) return null;

  const invoiceSelectDisabled = invoicesQuery.isLoading && !invoicesQuery.data;

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

        <form onSubmit={handleSubmit(submitPayment)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Invoice</label>
            <select className="input-field" disabled={invoiceSelectDisabled} {...register('invoiceId')}>
              <option value="">
                {invoiceSelectDisabled
                  ? 'Loading invoices...'
                  : payableInvoices.length === 0
                    ? 'No invoices with outstanding balance'
                    : 'Select invoice...'}
              </option>
              {payableInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.clientName} (Bal: {formatCurrency(getInvoiceBalance(inv))})
                </option>
              ))}
            </select>
            {invoicesQuery.isError && (
              <p className="mt-1 text-xs text-red-400">
                {getApiErrorMessage(invoicesQuery.error, 'Failed to load invoices.')}
              </p>
            )}
            {errors.invoiceId && <p className="mt-1 text-xs text-red-400">{errors.invoiceId.message}</p>}
          </div>

          {selectedInvoice && (
            <div className="rounded-lg border border-surface-border bg-surface-elevated p-3 text-sm text-gray-400">
              Balance due:{' '}
              <span className="font-semibold text-gold">{formatCurrency(selectedBalance ?? 0)}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Amount (₹)</label>
            <input
              type="number"
              min="1"
              max={selectedBalance}
              step="1"
              className="input-field"
              {...register('amount', { valueAsNumber: true })}
            />
            {selectedBalance !== undefined && (
              <p className="mt-1 text-xs text-gray-500">Maximum: {formatCurrency(selectedBalance)}</p>
            )}
            {errors.amount && <p className="mt-1 text-xs text-red-400">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Payment Method</label>
            <select className="input-field" {...register('paymentModeCode')}>
              {paymentModeOptions.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
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
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || invoiceSelectDisabled || payableInvoices.length === 0}
            >
              {isSubmitting ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

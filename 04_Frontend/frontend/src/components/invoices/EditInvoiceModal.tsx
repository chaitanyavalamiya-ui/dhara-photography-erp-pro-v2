import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Invoice } from '@/services/invoices-service';
import { formatCurrency } from '@/utils/booking-form';
import { InvoiceDeliverablesFields } from '@/components/invoices/InvoiceDeliverablesFields';
import {
  InvoiceDeliverables,
  parseInvoiceDeliverables,
  stripInvoiceDeliverableMarker,
} from '@/utils/invoice-deliverables';

const editInvoiceSchema = z.object({
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

type EditInvoiceForm = z.infer<typeof editInvoiceSchema>;

interface EditInvoiceModalProps {
  open: boolean;
  invoice: Invoice | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: EditInvoiceForm & { deliverables: InvoiceDeliverables }) => void;
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
  const [deliverables, setDeliverables] = useState<InvoiceDeliverables>({
    items: [],
    videoMedia: '',
  });

  useEffect(() => {
    if (open && invoice) {
      reset({
        dueDate: invoice.dueDate ?? '',
        notes: invoice.deliverables
          ? invoice.notes ?? ''
          : stripInvoiceDeliverableMarker(invoice.notes),
      });
      setDeliverables(
        invoice.deliverables
          ? {
              items: invoice.deliverables.items.filter((item): item is InvoiceDeliverables['items'][number] =>
                Boolean(item),
              ) as InvoiceDeliverables['items'],
              videoMedia:
                invoice.deliverables.videoMedia === 'pendrive' ||
                invoice.deliverables.videoMedia === 'hard_disk'
                  ? invoice.deliverables.videoMedia
                  : '',
            }
          : parseInvoiceDeliverables(invoice.notes),
      );
    }
  }, [open, invoice, reset]);

  if (!open || !invoice) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[90vh] w-full max-w-md overflow-y-auto">
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
            <p>Paid</p>
            <p className="text-right font-medium text-green-400">
              {formatCurrency(invoice.advanceAmount)}
            </p>
            <p>Balance</p>
            <p className="text-right font-medium text-gold">
              {formatCurrency(invoice.balanceAmount)}
            </p>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Paid amounts are updated automatically when payments are recorded.
          </p>
        </div>

        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              notes: values.notes ?? '',
              deliverables,
            }),
          )}
          className="space-y-4"
        >
          <div>
            <label htmlFor="dueDate" className="mb-1.5 block text-sm font-medium text-gray-300">
              Due Date
            </label>
            <input id="dueDate" type="date" className="input-field" {...register('dueDate')} />
            {errors.dueDate && (
              <p className="mt-1 text-xs text-red-400">{errors.dueDate.message}</p>
            )}
          </div>

          <InvoiceDeliverablesFields value={deliverables} onChange={setDeliverables} />

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

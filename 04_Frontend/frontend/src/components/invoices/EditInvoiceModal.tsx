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
    <div className="dhara-inv-modal is-edit">
      <div className="dhara-inv-modal-card">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2>Update Invoice</h2>
            <p className="dhara-inv-modal-sub">{invoice.invoiceNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="dhara-inv-icon-btn" aria-label="Close">
            <X strokeWidth={2.4} absoluteStrokeWidth />
          </button>
        </div>

        <div className="dhara-inv-breakdown mb-5">
          <p>Grand Total</p>
          <strong>{formatCurrency(invoice.totalAmount)}</strong>
          <p>Paid</p>
          <strong style={{ color: '#86efac' }}>{formatCurrency(invoice.advanceAmount)}</strong>
          <p>Balance</p>
          <strong>{formatCurrency(invoice.balanceAmount)}</strong>
        </div>
        <p className="dhara-inv-hint mb-4">
          Paid amounts are updated automatically when payments are recorded.
        </p>

        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              notes: values.notes ?? '',
              deliverables,
            }),
          )}
          className="dhara-inv-form"
        >
          <div className="dhara-inv-field">
            <label htmlFor="dueDate">Due Date</label>
            <input id="dueDate" type="date" className="input-field" {...register('dueDate')} />
            {errors.dueDate && <p className="dhara-inv-hint" style={{ color: '#fecaca' }}>{errors.dueDate.message}</p>}
          </div>

          <div className="dhara-inv-deliverables">
            <InvoiceDeliverablesFields value={deliverables} onChange={setDeliverables} />
          </div>

          <div className="dhara-inv-field">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" rows={3} className="dhara-inv-input" style={{ resize: 'none', minHeight: '6.2rem' }} {...register('notes')} />
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" className="dhara-inv-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dhara-inv-btn is-gold" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

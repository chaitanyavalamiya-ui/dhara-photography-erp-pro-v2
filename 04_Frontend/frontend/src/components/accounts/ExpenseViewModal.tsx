import { X } from 'lucide-react';
import {
  Expense,
  getExpenseSource,
  getExpenseSourceDescription,
  getExpenseSourceLabel,
} from '@/services/expenses-service';
import { formatCurrency } from '@/utils/booking-form';
import { cn } from '@/utils/cn';

interface ExpenseViewModalProps {
  open: boolean;
  expense: Expense | null;
  onClose: () => void;
  onEdit?: (expense: Expense) => void;
  canEdit?: boolean;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-elevated p-3">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-100">{value}</p>
    </div>
  );
}

export function ExpenseViewModal({
  open,
  expense,
  onClose,
  onEdit,
  canEdit = false,
}: ExpenseViewModalProps) {
  if (!open || !expense) return null;

  const source = getExpenseSource(expense);
  const systemLinked = source !== 'manual';
  const sourceDescription = getExpenseSourceDescription(source);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">{expense.categoryLabel}</p>
            <h2 className="font-display text-2xl font-semibold text-gold">
              {formatCurrency(expense.amount)}
            </h2>
            <p className="mt-1 text-sm text-gray-400">{expense.expenseDate}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:text-gold"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={cn(
            'mb-4 rounded-lg border px-3 py-2 text-sm',
            systemLinked
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
              : 'border-surface-border bg-surface-elevated text-gray-300',
          )}
        >
          <p className="font-medium">{getExpenseSourceLabel(source)}</p>
          {sourceDescription && <p className="mt-1 text-xs text-amber-100/80">{sourceDescription}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailRow label="Description" value={expense.description || '—'} />
          <DetailRow label="Vendor / Person" value={expense.vendorPerson || '—'} />
          <DetailRow label="Payment Method" value={expense.paymentModeLabel || '—'} />
          <DetailRow label="Reference" value={expense.referenceNumber || '—'} />
          <DetailRow label="Booking" value={expense.bookingNumber || '—'} />
          <DetailRow label="Client" value={expense.clientName || '—'} />
          <DetailRow label="Staff" value={expense.staffName || '—'} />
          <DetailRow label="Invoice" value={expense.invoiceNumber || '—'} />
        </div>

        {expense.notes && (
          <div className="mt-3 rounded-lg border border-surface-border bg-surface-elevated p-3">
            <p className="text-xs uppercase tracking-wider text-gray-500">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{expense.notes}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-surface-border pt-5">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {canEdit && !systemLinked && onEdit && (
            <button type="button" className="btn-primary" onClick={() => onEdit(expense)}>
              Edit Expense
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

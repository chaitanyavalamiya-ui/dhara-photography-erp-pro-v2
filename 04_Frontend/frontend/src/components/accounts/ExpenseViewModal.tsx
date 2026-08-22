import { X } from 'lucide-react';
import {
  Expense,
  getExpenseSource,
  getExpenseSourceDescription,
  getExpenseSourceLabel,
} from '@/services/expenses-service';
import { formatCurrency } from '@/utils/booking-form';
import { cn } from '@/utils/cn';
import '@/pages/expenses/expenses-page.css';

interface ExpenseViewModalProps {
  open: boolean;
  expense: Expense | null;
  onClose: () => void;
  onEdit?: (expense: Expense) => void;
  canEdit?: boolean;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="dhara-exp-fact">
      <span>{label}</span>
      <strong>{value}</strong>
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
    <div className="dhara-exp dhara-exp-modal">
      <div className="dhara-exp-modal-card">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="dhara-exp-kicker">{expense.categoryLabel}</p>
            <h2>{formatCurrency(expense.amount)}</h2>
            <p className="dhara-exp-modal-sub">{expense.expenseDate}</p>
          </div>
          <button type="button" onClick={onClose} className="dhara-exp-icon-btn" aria-label="Close">
            <X />
          </button>
        </div>

        <div className={cn('dhara-exp-flash', systemLinked ? 'is-bad' : 'is-ok')}>
          <p>{getExpenseSourceLabel(source)}</p>
          {sourceDescription && (
            <p className="dhara-exp-note" style={{ margin: '0.35rem 0 0' }}>
              {sourceDescription}
            </p>
          )}
        </div>

        <div className="dhara-exp-facts" style={{ marginTop: '1rem' }}>
          <DetailRow label="Description" value={expense.description || '—'} />
          <DetailRow label="Vendor / Person" value={expense.vendorPerson || '—'} />
          <DetailRow label="Payment Method" value={expense.paymentModeLabel || '—'} />
          <DetailRow label="Receipt / Reference" value={expense.referenceNumber || '—'} />
          <DetailRow label="Booking" value={expense.bookingNumber || '—'} />
          <DetailRow label="Client" value={expense.clientName || '—'} />
          <DetailRow label="Staff" value={expense.staffName || '—'} />
          <DetailRow label="Invoice" value={expense.invoiceNumber || '—'} />
        </div>

        {expense.notes && (
          <div className="dhara-exp-fact" style={{ marginTop: '0.75rem' }}>
            <span>Notes</span>
            <strong style={{ whiteSpace: 'pre-wrap', fontWeight: 650 }}>{expense.notes}</strong>
          </div>
        )}

        <div className="dhara-exp-form-actions">
          <button type="button" className="dhara-exp-btn" onClick={onClose}>
            Close
          </button>
          {canEdit && !systemLinked && onEdit && (
            <button type="button" className="dhara-exp-btn is-gold" onClick={() => onEdit(expense)}>
              Edit Expense
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

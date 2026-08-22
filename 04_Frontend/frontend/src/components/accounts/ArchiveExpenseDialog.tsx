import { AlertTriangle } from 'lucide-react';
import { Expense } from '@/services/expenses-service';
import { formatCurrency } from '@/utils/booking-form';
import '@/pages/expenses/expenses-page.css';

interface ArchiveExpenseDialogProps {
  open: boolean;
  expense: Expense | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ArchiveExpenseDialog({
  open,
  expense,
  isSubmitting,
  onClose,
  onConfirm,
}: ArchiveExpenseDialogProps) {
  if (!open || !expense) return null;

  return (
    <div className="dhara-exp dhara-exp-modal">
      <div className="dhara-exp-modal-card">
        <div className="mb-4 flex items-start gap-3">
          <span className="dhara-exp-icon is-rose">
            <AlertTriangle />
          </span>
          <div>
            <h2>Archive Expense</h2>
            <p className="dhara-exp-modal-sub">
              Archive this {expense.categoryLabel.toLowerCase()} expense of{' '}
              <span className="dhara-exp-amt is-gold">{formatCurrency(expense.amount)}</span> from{' '}
              {expense.expenseDate}? It will be hidden from active lists but kept in history.
            </p>
          </div>
        </div>

        <div className="dhara-exp-form-actions">
          <button type="button" className="dhara-exp-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="dhara-exp-btn is-gold"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Archiving...' : 'Archive Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

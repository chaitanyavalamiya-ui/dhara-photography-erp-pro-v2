import { AlertTriangle, X } from 'lucide-react';
import { BookingReminder } from '@/services/booking-operations-service';
import { formatDate } from '@/utils/booking-form';
import '@/pages/bookings/bookings-page.css';

interface DeleteReminderDialogProps {
  open: boolean;
  reminder: BookingReminder | null;
  isDeleting?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteReminderDialog({
  open,
  reminder,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteReminderDialogProps) {
  if (!open || !reminder) return null;

  const typeLabel = reminder.reminderType.replace(/_/g, ' ');

  return (
    <div className="dhara-bookings dhara-bookings-modal">
      <div className="dhara-bookings-modal-card is-narrow">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="dhara-bookings-icon is-amber">
              <AlertTriangle />
            </div>
            <div>
              <h2>Remove Reminder</h2>
              <p className="mt-2 text-[1.02rem] text-[#ffe7b8]">
                Remove the{' '}
                <span className="text-[#ffd45a] capitalize">{typeLabel}</span> reminder
                {reminder.reminderDate ? ` on ${formatDate(reminder.reminderDate)}` : ''}? This
                archives the reminder.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#ffe7b8] transition hover:text-[#ffd45a]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <button type="button" className="dhara-bookings-ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-[1.02rem] font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Removing...' : 'Remove Reminder'}
          </button>
        </div>
      </div>
    </div>
  );
}

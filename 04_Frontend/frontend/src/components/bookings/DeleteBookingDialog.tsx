import { AlertTriangle, X } from 'lucide-react';
import { Booking } from '@/services/bookings-service';
import '@/pages/bookings/bookings-page.css';

interface DeleteBookingDialogProps {
  open: boolean;
  booking: Booking | null;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteBookingDialog({
  open,
  booking,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteBookingDialogProps) {
  if (!open || !booking) return null;

  return (
    <div className="dhara-bookings dhara-bookings-modal">
      <div className="dhara-bookings-modal-card is-narrow">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="dhara-bookings-icon is-amber">
              <AlertTriangle />
            </div>
            <div>
              <h2>Delete Booking</h2>
              <p className="mt-2 text-[1.02rem] text-[#ffe7b8]">
                Are you sure you want to delete booking{' '}
                <span className="text-[#ffd45a]">{booking.bookingNumber}</span>? This will archive the
                booking record.
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

        <div className="flex justify-end gap-3">
          <button type="button" className="dhara-bookings-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-[1.02rem] font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { AlertTriangle } from 'lucide-react';
import { DeliveryItem } from '@/services/deliveries-service';

interface ArchiveDeliveryDialogProps {
  open: boolean;
  delivery: DeliveryItem | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ArchiveDeliveryDialog({
  open,
  delivery,
  isSubmitting,
  onClose,
  onConfirm,
}: ArchiveDeliveryDialogProps) {
  if (!open || !delivery) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-red-500/10 p-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-gray-100">Archive Delivery</h2>
            <p className="mt-1 text-sm text-gray-400">
              Archive <span className="text-gold">{delivery.title}</span> for{' '}
              <span className="text-gray-200">{delivery.clientName}</span> (
              {delivery.bookingNumber})? This hides it from active lists but keeps delivery history.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Archiving...' : 'Archive Delivery'}
          </button>
        </div>
      </div>
    </div>
  );
}

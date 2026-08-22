import { AlertTriangle } from 'lucide-react';
import { DeliveryItem } from '@/services/deliveries-service';
import '@/pages/deliveries/deliveries-page.css';

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
    <div className="dhara-del dhara-del-modal">
      <div className="dhara-del-modal-card">
        <div className="mb-4 flex items-start gap-3">
          <span className="dhara-del-icon is-rose">
            <AlertTriangle />
          </span>
          <div>
            <h2>Archive Delivery</h2>
            <p className="dhara-del-modal-sub">
              Archive <span className="dhara-del-amt is-gold">{delivery.title}</span> for{' '}
              {delivery.clientName} ({delivery.bookingNumber})? This hides it from active lists but
              keeps delivery history.
            </p>
          </div>
        </div>

        <div className="dhara-del-form-actions">
          <button type="button" className="dhara-del-btn" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className="dhara-del-btn is-gold"
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

import { X } from 'lucide-react';
import { DeliveryItem } from '@/services/deliveries-service';
import { formatDate } from '@/utils/booking-form';
import { cn } from '@/utils/cn';
import { deliveryStatusTone } from '@/components/deliveries/delivery-visual';
import '@/pages/deliveries/deliveries-page.css';

interface DeliveryViewModalProps {
  open: boolean;
  delivery: DeliveryItem | null;
  onClose: () => void;
  onEdit?: () => void;
}

export function DeliveryViewModal({ open, delivery, onClose, onEdit }: DeliveryViewModalProps) {
  if (!open || !delivery) return null;

  return (
    <div className="dhara-del dhara-del-modal">
      <div className="dhara-del-modal-card">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2>{delivery.title}</h2>
            <p className="dhara-del-modal-sub">{delivery.deliverableTypeLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="dhara-del-icon-btn" aria-label="Close">
            <X />
          </button>
        </div>

        <div className="dhara-del-facts">
          <div className="dhara-del-fact">
            <span>Status</span>
            <strong>
              <span className={cn('dhara-del-pill', deliveryStatusTone(delivery.status))}>
                {delivery.statusLabel}
              </span>
            </strong>
          </div>
          <div className="dhara-del-fact">
            <span>Client</span>
            <strong>{delivery.clientName}</strong>
          </div>
          <div className="dhara-del-fact">
            <span>Booking</span>
            <strong>{delivery.bookingNumber}</strong>
          </div>
          {delivery.albumName ? (
            <div className="dhara-del-fact">
              <span>Album</span>
              <strong>{delivery.albumName}</strong>
            </div>
          ) : null}
          <div className="dhara-del-fact">
            <span>Expected</span>
            <strong>{formatDate(delivery.expectedDate)}</strong>
          </div>
          <div className="dhara-del-fact">
            <span>Delivered</span>
            <strong>{formatDate(delivery.deliveredDate)}</strong>
          </div>
        </div>

        {delivery.notes ? (
          <div className="dhara-del-fact" style={{ marginTop: '0.85rem' }}>
            <span>Notes</span>
            <strong style={{ fontWeight: 650, whiteSpace: 'pre-wrap' }}>{delivery.notes}</strong>
          </div>
        ) : null}

        <div className="dhara-del-form-actions">
          <button type="button" className="dhara-del-btn" onClick={onClose}>
            Close
          </button>
          {onEdit && (
            <button type="button" className="dhara-del-btn is-gold" onClick={onEdit}>
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

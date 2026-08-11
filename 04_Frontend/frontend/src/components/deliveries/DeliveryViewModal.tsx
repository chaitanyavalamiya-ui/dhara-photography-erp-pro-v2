import { DeliveryItem } from '@/services/deliveries-service';
import { formatDate } from '@/utils/booking-form';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DeliveryViewModalProps {
  open: boolean;
  delivery: DeliveryItem | null;
  onClose: () => void;
  onEdit?: () => void;
}

function statusClass(status: string) {
  switch (status) {
    case 'ready':
      return 'bg-green-500/10 text-green-400';
    case 'delivered':
      return 'bg-gold/10 text-gold';
    default:
      return 'bg-amber-500/10 text-amber-300';
  }
}

export function DeliveryViewModal({ open, delivery, onClose, onEdit }: DeliveryViewModalProps) {
  if (!open || !delivery) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-lg">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">{delivery.title}</h2>
            <p className="mt-1 text-sm text-gray-400">{delivery.deliverableTypeLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-gold">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Status</span>
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', statusClass(delivery.status))}>
              {delivery.statusLabel}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Client</span>
            <span className="text-gray-200">{delivery.clientName}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Booking</span>
            <span className="text-gray-200">{delivery.bookingNumber}</span>
          </div>
          {delivery.albumName && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Album</span>
              <span className="text-gray-200">{delivery.albumName}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Expected</span>
            <span className="text-gray-200">{formatDate(delivery.expectedDate)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Delivered</span>
            <span className="text-gray-200">{formatDate(delivery.deliveredDate)}</span>
          </div>
          {delivery.notes && (
            <div className="rounded-lg border border-surface-border bg-surface-elevated p-3 text-gray-300">
              {delivery.notes}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-surface-border pt-5">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {onEdit && (
            <button type="button" className="btn-primary" onClick={onEdit}>
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

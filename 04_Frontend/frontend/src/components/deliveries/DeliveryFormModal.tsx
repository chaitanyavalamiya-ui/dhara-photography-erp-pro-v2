import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { bookingsService } from '@/services/bookings-service';
import { albumsService } from '@/services/albums-service';
import {
  DELIVERABLE_TYPE_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  DeliveryItem,
  DeliverableType,
  DeliveryStatus,
} from '@/services/deliveries-service';

interface DeliveryFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  delivery?: DeliveryItem | null;
  prefillBookingId?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: {
    bookingId: string;
    albumId?: string;
    deliverableType: DeliverableType;
    title: string;
    status: DeliveryStatus;
    expectedDate: string;
    deliveredDate: string;
    notes: string;
  }) => void;
}

export function DeliveryFormModal({
  open,
  mode,
  delivery,
  prefillBookingId,
  isSubmitting,
  onClose,
  onSubmit,
}: DeliveryFormModalProps) {
  const isEdit = mode === 'edit';

  const [bookingId, setBookingId] = useState(prefillBookingId ?? '');
  const [albumId, setAlbumId] = useState('');
  const [deliverableType, setDeliverableType] = useState<DeliverableType>('album');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<DeliveryStatus>('pending');
  const [expectedDate, setExpectedDate] = useState('');
  const [deliveredDate, setDeliveredDate] = useState('');
  const [notes, setNotes] = useState('');

  const bookingLocked = Boolean(prefillBookingId) && !isEdit;

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'delivery-select'],
    queryFn: () =>
      bookingsService.list({ limit: 100, status: 'all', sortBy: 'eventDate', sortOrder: 'desc' }),
    enabled: open,
  });

  const prefillBookingQuery = useQuery({
    queryKey: ['bookings', 'delivery-prefill', prefillBookingId],
    queryFn: () => bookingsService.getById(prefillBookingId!),
    enabled: open && Boolean(prefillBookingId) && !isEdit,
  });

  const albumsQuery = useQuery({
    queryKey: ['albums', 'delivery-select', bookingId],
    queryFn: () => albumsService.list({ bookingId, limit: 50 }),
    enabled: open && Boolean(bookingId),
  });

  const bookingOptions = (() => {
    const items = bookingsQuery.data?.items ?? [];
    const prefill = prefillBookingQuery.data;
    if (prefill && !items.some((booking) => booking.id === prefill.id)) {
      return [prefill, ...items];
    }
    return items;
  })();

  useEffect(() => {
    if (!open) return;

    if (isEdit && delivery) {
      setBookingId(delivery.bookingId);
      setAlbumId(delivery.albumId ?? '');
      setDeliverableType(delivery.deliverableType);
      setTitle(delivery.title);
      setStatus(delivery.status);
      setExpectedDate(delivery.expectedDate ?? '');
      setDeliveredDate(delivery.deliveredDate ?? '');
      setNotes(delivery.notes ?? '');
      return;
    }

    setBookingId(prefillBookingId ?? '');
    setAlbumId('');
    setDeliverableType('album');
    setTitle(DELIVERABLE_TYPE_OPTIONS.find((o) => o.value === 'album')?.label ?? 'Album');
    setStatus('pending');
    setExpectedDate('');
    setDeliveredDate('');
    setNotes('');
  }, [open, isEdit, delivery, prefillBookingId]);

  useEffect(() => {
    if (!isEdit) {
      const label = DELIVERABLE_TYPE_OPTIONS.find((o) => o.value === deliverableType)?.label;
      if (label && (!title || DELIVERABLE_TYPE_OPTIONS.some((o) => o.label === title))) {
        setTitle(label);
      }
    }
  }, [deliverableType, isEdit, title]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">
              {isEdit ? 'Update Delivery' : 'Add Delivery Item'}
            </h2>
            <p className="mt-1 text-sm text-gray-400">Track client deliverables for a booking.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-gold">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!bookingId || !title.trim()) return;
            onSubmit({
              bookingId,
              albumId: albumId || undefined,
              deliverableType,
              title: title.trim(),
              status,
              expectedDate,
              deliveredDate,
              notes,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Booking</label>
            <select
              className="input-field"
              value={bookingId}
              onChange={(e) => {
                setBookingId(e.target.value);
                setAlbumId('');
              }}
              disabled={isEdit || bookingLocked}
              required
            >
              <option value="">Select booking...</option>
              {bookingOptions.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.bookingNumber} — {booking.client.fullName}
                </option>
              ))}
            </select>
            {bookingLocked && (
              <p className="mt-1 text-xs text-gray-500">Booking is prefilled from the selected booking.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Deliverable Type</label>
              <select
                className="input-field"
                value={deliverableType}
                onChange={(e) => setDeliverableType(e.target.value as DeliverableType)}
              >
                {DELIVERABLE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Status</label>
              <select
                className="input-field"
                value={status}
                onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
              >
                {DELIVERY_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Title</label>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          {bookingId && (albumsQuery.data?.items.length ?? 0) > 0 && (
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Link Album (optional)</label>
              <select className="input-field" value={albumId} onChange={(e) => setAlbumId(e.target.value)}>
                <option value="">None</option>
                {albumsQuery.data?.items.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Expected Date</label>
              <input
                type="date"
                className="input-field"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Delivered Date</label>
              <input
                type="date"
                className="input-field"
                value={deliveredDate}
                onChange={(e) => setDeliveredDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Notes</label>
            <textarea
              rows={3}
              className="input-field resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { bookingsService } from '@/services/bookings-service';
import { GALLERY_STATUS_OPTIONS, GalleryStatus } from '@/services/galleries-service';

const schema = z.object({
  bookingId: z.string().min(1, 'Select a booking'),
  name: z.string().min(1, 'Gallery name is required'),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'client_review', 'approved', 'delivered']).optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateGalleryModalProps {
  open: boolean;
  isSubmitting?: boolean;
  existingBookingIds?: string[];
  onClose: () => void;
  onSubmit: (values: {
    bookingId: string;
    name: string;
    description?: string;
    status?: GalleryStatus;
  }) => void;
}

export function CreateGalleryModal({
  open,
  isSubmitting,
  existingBookingIds = [],
  onClose,
  onSubmit,
}: CreateGalleryModalProps) {
  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'gallery-create'],
    queryFn: () => bookingsService.list({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft' },
  });

  const bookingId = watch('bookingId');
  const selectedBooking = bookingsQuery.data?.items.find((b) => b.id === bookingId);

  useEffect(() => {
    if (open) {
      reset({ bookingId: '', name: '', description: '', status: 'draft' });
    }
  }, [open, reset]);

  useEffect(() => {
    if (!bookingId || !bookingsQuery.data) return;
    const booking = bookingsQuery.data.items.find((b) => b.id === bookingId);
    if (!booking) return;
    setValue('name', `${booking.eventType} — ${booking.client.fullName}`);
    setValue('description', booking.notes ?? '');
  }, [bookingId, bookingsQuery.data, setValue]);

  if (!open) return null;

  const bookings = (bookingsQuery.data?.items ?? []).filter(
    (b) => !existingBookingIds.includes(b.id),
  );
  const bookingsLoading = bookingsQuery.isLoading;
  const noBookingsAvailable = !bookingsLoading && !bookingsQuery.isError && bookings.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-lg">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">Create Gallery</h2>
            <p className="mt-1 text-sm text-gray-400">Link a gallery to an existing booking</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-gold">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Booking</label>
            <select
              className="input-field"
              disabled={bookingsLoading || noBookingsAvailable}
              {...register('bookingId')}
            >
              <option value="">
                {bookingsLoading
                  ? 'Loading bookings...'
                  : noBookingsAvailable
                    ? 'No bookings available'
                    : 'Select booking...'}
              </option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bookingNumber} — {b.client.fullName} ({b.eventType})
                </option>
              ))}
            </select>
            {bookingsQuery.isError && (
              <p className="mt-1 text-xs text-red-400">Failed to load bookings. Please try again.</p>
            )}
            {noBookingsAvailable && (
              <p className="mt-1 text-xs text-gray-500">
                All listed bookings already have an active gallery, or no bookings exist yet.
              </p>
            )}
            {errors.bookingId && <p className="mt-1 text-xs text-red-400">{errors.bookingId.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Gallery Name</label>
            <input className="input-field" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
          </div>

          {selectedBooking && (
            <div className="rounded-lg border border-surface-border bg-surface-elevated p-3 text-sm text-gray-400">
              <p>Client: <span className="text-gray-200">{selectedBooking.client.fullName}</span></p>
              <p>Event: <span className="text-gray-200">{selectedBooking.eventType}</span></p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Status</label>
            <select className="input-field" {...register('status')}>
              {GALLERY_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Description / Notes</label>
            <textarea rows={3} className="input-field resize-none" {...register('description')} />
          </div>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || bookingsLoading || noBookingsAvailable}
            >
              {isSubmitting ? 'Creating...' : 'Create Gallery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

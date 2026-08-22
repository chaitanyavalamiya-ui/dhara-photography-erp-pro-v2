import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { bookingsService } from '@/services/bookings-service';
import { GALLERY_STATUS_OPTIONS, galleriesService, GalleryStatus } from '@/services/galleries-service';

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
  onClose,
  onSubmit,
}: CreateGalleryModalProps) {
  const [bookingSearch, setBookingSearch] = useState('');

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'gallery-create', bookingSearch],
    queryFn: () =>
      bookingsService.list({
        limit: 20,
        search: bookingSearch.trim() || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
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

  const selectedBookingQuery = useQuery({
    queryKey: ['bookings', 'gallery-create-selected', bookingId],
    queryFn: () => bookingsService.getById(bookingId),
    enabled: open && Boolean(bookingId) && !selectedBooking,
  });

  const existingGalleryQuery = useQuery({
    queryKey: ['galleries', 'booking-exists', bookingId],
    queryFn: () => galleriesService.list({ bookingId, limit: 1 }),
    enabled: open && Boolean(bookingId),
  });

  const resolvedBooking = selectedBooking ?? selectedBookingQuery.data;
  const bookingAlreadyHasGallery = (existingGalleryQuery.data?.items.length ?? 0) > 0;

  useEffect(() => {
    if (open) {
      reset({ bookingId: '', name: '', description: '', status: 'draft' });
    }
  }, [open, reset]);

  useEffect(() => {
    if (!bookingId) return;
    const booking = resolvedBooking;
    if (!booking) return;
    setValue('name', `${booking.eventType} — ${booking.client.fullName}`);
    setValue('description', booking.notes ?? '');
  }, [bookingId, resolvedBooking, setValue]);

  if (!open) return null;

  const bookings = [...(bookingsQuery.data?.items ?? [])];
  if (resolvedBooking && !bookings.some((booking) => booking.id === resolvedBooking.id)) {
    bookings.unshift(resolvedBooking);
  }
  const bookingsLoading = bookingsQuery.isLoading;
  const noBookingsAvailable = !bookingsLoading && !bookingsQuery.isError && bookings.length === 0;

  return (
    <div className="dhara-gal-modal">
      <div className="dhara-gal-modal-card">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2>Create Gallery</h2>
            <p className="dhara-gal-modal-sub">Link a gallery to an existing booking</p>
          </div>
          <button type="button" onClick={onClose} className="dhara-gal-icon-btn" aria-label="Close">
            <X strokeWidth={2.4} absoluteStrokeWidth />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="dhara-gal-form">
          <div className="dhara-gal-field">
            <label htmlFor="create-gallery-booking-search">Booking</label>
            <input
              id="create-gallery-booking-search"
              className="dhara-gal-input"
              placeholder="Search bookings..."
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
            />
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
              <p className="dhara-gal-hint">Failed to load bookings. Please try again.</p>
            )}
            {noBookingsAvailable && (
              <p className="dhara-gal-hint is-muted">
                No bookings match this search, or no bookings exist yet.
              </p>
            )}
            {bookingAlreadyHasGallery && (
              <p className="dhara-gal-hint">This booking already has an active gallery.</p>
            )}
            {errors.bookingId && <p className="dhara-gal-hint">{errors.bookingId.message}</p>}
          </div>

          <div className="dhara-gal-field">
            <label htmlFor="create-gallery-name">Gallery Name</label>
            <input id="create-gallery-name" className="dhara-gal-input" {...register('name')} />
            {errors.name && <p className="dhara-gal-hint">{errors.name.message}</p>}
          </div>

          {resolvedBooking && (
            <div className="dhara-gal-booking-card">
              <p>Client: {resolvedBooking.client.fullName}</p>
              <p>Event: {resolvedBooking.eventType}</p>
            </div>
          )}

          <div className="dhara-gal-field">
            <label htmlFor="create-gallery-status">Status</label>
            <select id="create-gallery-status" className="input-field" {...register('status')}>
              {GALLERY_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="dhara-gal-field">
            <label htmlFor="create-gallery-notes">Description / Notes</label>
            <textarea
              id="create-gallery-notes"
              rows={3}
              className="dhara-gal-input"
              style={{ resize: 'none', minHeight: '6.5rem' }}
              {...register('description')}
            />
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" className="dhara-gal-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="dhara-gal-btn is-gold"
              disabled={isSubmitting || bookingsLoading || noBookingsAvailable || bookingAlreadyHasGallery}
            >
              {isSubmitting ? 'Creating...' : 'Create Gallery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

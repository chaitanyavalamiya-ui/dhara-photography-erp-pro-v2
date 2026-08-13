import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { bookingsService } from '@/services/bookings-service';
import { galleriesService } from '@/services/galleries-service';
import { ALBUM_STATUS_OPTIONS, ALBUM_TYPE_OPTIONS, AlbumType } from '@/services/albums-service';

const schema = z.object({
  bookingId: z.string().min(1, 'Select a booking'),
  galleryId: z.string().optional(),
  name: z.string().min(1, 'Album name is required'),
  albumType: z.enum(['standard', 'premium', 'luxury', 'royal']).optional(),
  albumPrice: z.coerce.number().min(0).optional(),
  pageCount: z.coerce.number().int().min(0).optional(),
  status: z.enum(['pending', 'designing', 'printing', 'ready', 'delivered', 'cancelled']).optional(),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  vendorName: z.string().optional(),
  vendorExpense: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateAlbumModalProps {
  open: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: {
    bookingId: string;
    galleryId?: string;
    name: string;
    albumType?: AlbumType;
    albumPrice?: number;
    pageCount?: number;
    status?: FormValues['status'];
    orderDate?: string;
    expectedDeliveryDate?: string;
    vendorName?: string;
    vendorExpense?: number;
    notes?: string;
  }) => void;
}

export function CreateAlbumModal({ open, isSubmitting, onClose, onSubmit }: CreateAlbumModalProps) {
  const [bookingSearch, setBookingSearch] = useState('');

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'album-create', bookingSearch],
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
    defaultValues: {
      albumType: 'standard',
      status: 'pending',
      albumPrice: 0,
      pageCount: 20,
      vendorExpense: 0,
      orderDate: new Date().toISOString().slice(0, 10),
    },
  });

  const bookingId = watch('bookingId');
  const selectedBooking = bookingsQuery.data?.items.find((b) => b.id === bookingId);

  const selectedBookingQuery = useQuery({
    queryKey: ['bookings', 'album-create-selected', bookingId],
    queryFn: () => bookingsService.getById(bookingId),
    enabled: open && Boolean(bookingId) && !selectedBooking,
  });

  const resolvedBooking = selectedBooking ?? selectedBookingQuery.data;

  const galleriesQuery = useQuery({
    queryKey: ['galleries', 'album-create', bookingId],
    queryFn: () => galleriesService.list({ bookingId, limit: 10 }),
    enabled: open && !!bookingId,
  });

  useEffect(() => {
    if (open) {
      reset({
        bookingId: '',
        galleryId: '',
        name: '',
        albumType: 'standard',
        status: 'pending',
        albumPrice: 0,
        pageCount: 20,
        vendorExpense: 0,
        orderDate: new Date().toISOString().slice(0, 10),
        expectedDeliveryDate: '',
        vendorName: '',
        notes: '',
      });
    }
  }, [open, reset]);

  useEffect(() => {
    if (!bookingId || !resolvedBooking) return;
    setValue('name', `${resolvedBooking.eventType} Album — ${resolvedBooking.client.fullName}`);
    const galleries = galleriesQuery.data?.items ?? [];
    if (galleries.length > 0) {
      setValue('galleryId', galleries[0].id);
    } else {
      setValue('galleryId', '');
    }
  }, [bookingId, resolvedBooking, galleriesQuery.data, setValue]);

  if (!open) return null;

  const bookingsLoading = bookingsQuery.isLoading;
  const bookings = [...(bookingsQuery.data?.items ?? [])];
  if (resolvedBooking && !bookings.some((booking) => booking.id === resolvedBooking.id)) {
    bookings.unshift(resolvedBooking);
  }
  const galleries = galleriesQuery.data?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">Create Album</h2>
            <p className="mt-1 text-sm text-gray-400">Link an album order to a booking and gallery</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-gold">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-300">Booking</label>
              <input
                className="input-field mb-2"
                placeholder="Search bookings..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
              />
              <select className="input-field" disabled={bookingsLoading} {...register('bookingId')}>
                <option value="">{bookingsLoading ? 'Loading bookings...' : 'Select booking...'}</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bookingNumber} — {b.client.fullName} ({b.eventType})
                  </option>
                ))}
              </select>
              {errors.bookingId && <p className="mt-1 text-xs text-red-400">{errors.bookingId.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-300">Gallery</label>
              <select className="input-field" disabled={!bookingId || galleriesQuery.isLoading} {...register('galleryId')}>
                <option value="">
                  {!bookingId
                    ? 'Select a booking first'
                    : galleriesQuery.isLoading
                      ? 'Loading galleries...'
                      : galleries.length
                        ? 'Select gallery (optional)'
                        : 'No gallery for this booking'}
                </option>
                {galleries.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.photoCount} photos){galleries[0]?.id === g.id ? ' — latest' : ''}
                  </option>
                ))}
              </select>
              {galleries.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Active gallery auto-selected. Choose another if needed.
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-300">Album Name</label>
              <input className="input-field" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Album Type</label>
              <select className="input-field" {...register('albumType')}>
                {ALBUM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Status</label>
              <select className="input-field" {...register('status')}>
                {ALBUM_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Selling Price (₹)</label>
              <input type="number" min={0} step="0.01" className="input-field" {...register('albumPrice')} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Pages</label>
              <input type="number" min={0} className="input-field" {...register('pageCount')} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Order Date</label>
              <input type="date" className="input-field" {...register('orderDate')} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Expected Delivery</label>
              <input type="date" className="input-field" {...register('expectedDeliveryDate')} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Vendor / Printer</label>
              <input className="input-field" {...register('vendorName')} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Vendor Expense (₹)</label>
              <input type="number" min={0} step="0.01" className="input-field" {...register('vendorExpense')} />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-300">Notes</label>
              <textarea rows={3} className="input-field resize-none" {...register('notes')} />
            </div>
          </div>

          {resolvedBooking && (
            <div className="rounded-lg border border-surface-border bg-surface-elevated p-3 text-sm text-gray-400">
              <p>Client: <span className="text-gray-200">{resolvedBooking.client.fullName}</span></p>
              <p>Event: <span className="text-gray-200">{resolvedBooking.eventType}</span></p>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || bookingsLoading}>
              {isSubmitting ? 'Creating...' : 'Create Album'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

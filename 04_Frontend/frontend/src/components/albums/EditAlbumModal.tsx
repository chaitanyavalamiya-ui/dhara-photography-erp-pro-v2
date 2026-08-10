import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import {
  ALBUM_STATUS_OPTIONS,
  ALBUM_TYPE_OPTIONS,
  Album,
  AlbumType,
  UpdateAlbumPayload,
} from '@/services/albums-service';

const schema = z.object({
  name: z.string().min(1, 'Album name is required'),
  albumType: z.enum(['standard', 'premium', 'luxury', 'royal']),
  albumPrice: z.coerce.number().min(0),
  pageCount: z.coerce.number().int().min(0),
  status: z.enum(['pending', 'designing', 'printing', 'ready', 'delivered', 'cancelled']),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  actualDeliveryDate: z.string().optional(),
  vendorName: z.string().optional(),
  vendorExpense: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditAlbumModalProps {
  open: boolean;
  album: Album | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: UpdateAlbumPayload) => void;
}

export function EditAlbumModal({ open, album, isSubmitting, onClose, onSubmit }: EditAlbumModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open && album) {
      reset({
        name: album.name,
        albumType: album.albumType as AlbumType,
        albumPrice: album.albumPrice,
        pageCount: album.pageCount,
        status: album.status,
        orderDate: album.orderDate ?? '',
        expectedDeliveryDate: album.expectedDeliveryDate ?? '',
        actualDeliveryDate: album.actualDeliveryDate ?? '',
        vendorName: album.vendorName ?? '',
        vendorExpense: album.vendorExpense,
        notes: album.notes ?? '',
      });
    }
  }, [open, album, reset]);

  if (!open || !album) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">Edit Album</h2>
            <p className="mt-1 text-sm text-gray-400">{album.bookingNumber} — {album.clientName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-gold">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
              <label className="mb-1.5 block text-sm text-gray-300">Actual Delivery</label>
              <input type="date" className="input-field" {...register('actualDeliveryDate')} />
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

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

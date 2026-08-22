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
    <div className="dhara-alb-modal">
      <div className="dhara-alb-modal-card">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2>Edit Album</h2>
            <p className="dhara-alb-modal-sub">{album.bookingNumber} — {album.clientName}</p>
          </div>
          <button type="button" onClick={onClose} className="dhara-alb-icon-btn" aria-label="Close">
            <X strokeWidth={2.4} absoluteStrokeWidth />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="dhara-alb-form">
          <div className="dhara-alb-form-grid">
            <div className="dhara-alb-span-2">
              <label>Album Name</label>
              <input className="input-field" {...register('name')} />
              {errors.name && <p className="dhara-alb-error-text">{errors.name.message}</p>}
            </div>

            <div>
              <label>Album Type</label>
              <select className="input-field" {...register('albumType')}>
                {ALBUM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Status</label>
              <select className="input-field" {...register('status')}>
                {ALBUM_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Selling Price (₹)</label>
              <input type="number" min={0} step="0.01" className="input-field" {...register('albumPrice')} />
            </div>

            <div>
              <label>Pages</label>
              <input type="number" min={0} className="input-field" {...register('pageCount')} />
            </div>

            <div>
              <label>Order Date</label>
              <input type="date" className="input-field" {...register('orderDate')} />
            </div>

            <div>
              <label>Expected Delivery</label>
              <input type="date" className="input-field" {...register('expectedDeliveryDate')} />
            </div>

            <div>
              <label>Actual Delivery</label>
              <input type="date" className="input-field" {...register('actualDeliveryDate')} />
            </div>

            <div>
              <label>Vendor / Printer</label>
              <input className="input-field" {...register('vendorName')} />
            </div>

            <div>
              <label>Vendor Expense (₹)</label>
              <input type="number" min={0} step="0.01" className="input-field" {...register('vendorExpense')} />
            </div>

            <div className="dhara-alb-span-2">
              <label>Notes</label>
              <textarea rows={3} className="input-field resize-none" {...register('notes')} />
            </div>
          </div>

          <div className="dhara-alb-form-actions">
            <button type="button" className="dhara-alb-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="dhara-alb-btn is-gold" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

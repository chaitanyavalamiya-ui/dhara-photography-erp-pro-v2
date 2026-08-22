import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { SettingsServiceRate } from '@/services/settings-service';
import { formatCurrency } from '@/utils/booking-form';
import '@/pages/settings/settings-page.css';

const editRateSchema = z.object({
  defaultRate: z
    .number({ invalid_type_error: 'Enter a valid rate' })
    .finite('Enter a valid rate')
    .min(1, 'Rate must be at least ₹1'),
  isActive: z.boolean(),
});

type EditRateForm = z.infer<typeof editRateSchema>;

interface EditServiceRateModalProps {
  open: boolean;
  rate: SettingsServiceRate | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: { defaultRate: number; isActive: boolean }) => void;
}

export function EditServiceRateModal({
  open,
  rate,
  isSubmitting,
  onClose,
  onSubmit,
}: EditServiceRateModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditRateForm>({
    resolver: zodResolver(editRateSchema),
    values: rate ? { defaultRate: rate.defaultRate, isActive: rate.isActive } : undefined,
  });

  if (!open || !rate) return null;

  return (
    <div className="dhara-set-modal">
      <div className="dhara-set-modal-card">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2>Edit Service Rate</h2>
            <p className="dhara-set-modal-sub">{rate.name}</p>
          </div>
          <button type="button" onClick={onClose} className="dhara-set-icon-btn" aria-label="Close">
            <X />
          </button>
        </div>

        <div className="dhara-set-facts" style={{ marginBottom: '1.1rem' }}>
          <div className="dhara-set-fact">
            <span>Category</span>
            <strong className="capitalize">{rate.category}</strong>
          </div>
          <div className="dhara-set-fact">
            <span>Unit</span>
            <strong>{rate.unit}</strong>
          </div>
          <div className="dhara-set-fact">
            <span>Current rate</span>
            <strong className="dhara-set-amt is-gold">{formatCurrency(rate.defaultRate)}</strong>
          </div>
        </div>

        <form key={rate.id} onSubmit={handleSubmit((values) => onSubmit(values))} className="dhara-set-form">
          <div>
            <label htmlFor="defaultRate">
              New Rate (₹) <span className="dhara-set-amt is-gold">*</span>
            </label>
            <input
              id="defaultRate"
              type="number"
              min="1"
              step="1"
              className="dhara-set-input"
              {...register('defaultRate', { valueAsNumber: true })}
            />
            {errors.defaultRate && <p className="dhara-set-err">{errors.defaultRate.message}</p>}
          </div>

          <label className="dhara-set-check">
            <input type="checkbox" {...register('isActive')} />
            Active for new bookings
          </label>

          <div className="dhara-set-form-actions">
            <button type="button" className="dhara-set-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dhara-set-btn is-gold" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Rate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

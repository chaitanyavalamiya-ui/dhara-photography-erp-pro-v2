import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { SettingsServiceRate } from '@/services/settings-service';
import { formatCurrency } from '@/utils/booking-form';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">Edit Service Rate</h2>
            <p className="mt-1 text-sm text-gray-400">{rate.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 rounded-lg border border-surface-border bg-surface-elevated p-4 text-sm">
          <div className="grid grid-cols-2 gap-3 text-gray-400">
            <p>Category</p>
            <p className="text-right capitalize text-gray-200">{rate.category}</p>
            <p>Unit</p>
            <p className="text-right text-gray-200">{rate.unit}</p>
            <p>Current rate</p>
            <p className="text-right font-medium text-gold">{formatCurrency(rate.defaultRate)}</p>
          </div>
        </div>

        <form
          key={rate.id}
          onSubmit={handleSubmit((values) => onSubmit(values))}
          className="space-y-5"
        >
          <div>
            <label htmlFor="defaultRate" className="mb-1.5 block text-sm font-medium text-gray-300">
              New Rate (₹) <span className="text-gold">*</span>
            </label>
            <input
              id="defaultRate"
              type="number"
              min="1"
              step="1"
              className="input-field"
              {...register('defaultRate', { valueAsNumber: true })}
            />
            {errors.defaultRate && (
              <p className="mt-1 text-xs text-red-400">{errors.defaultRate.message}</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" className="rounded border-surface-border" {...register('isActive')} />
            Active for new bookings
          </label>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Rate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

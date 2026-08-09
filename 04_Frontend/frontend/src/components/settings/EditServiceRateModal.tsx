import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { SettingsServiceRate } from '@/services/settings-service';
import { formatCurrency } from '@/utils/booking-form';

const editRateSchema = z.object({
  defaultRate: z
    .number({ invalid_type_error: 'Enter a valid rate' })
    .positive('Rate must be a positive number'),
});

type EditRateForm = z.infer<typeof editRateSchema>;

interface EditServiceRateModalProps {
  open: boolean;
  rate: SettingsServiceRate | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (defaultRate: number) => void;
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
    reset,
    formState: { errors },
  } = useForm<EditRateForm>({
    resolver: zodResolver(editRateSchema),
    defaultValues: { defaultRate: rate?.defaultRate ?? 0 },
  });

  useEffect(() => {
    if (open && rate) {
      reset({ defaultRate: rate.defaultRate });
    }
  }, [open, rate, reset]);

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
          onSubmit={handleSubmit((values) => onSubmit(values.defaultRate))}
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

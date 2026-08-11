import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { MasterDataCategory } from '@/services/settings-service';

const schema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(100),
  code: z
    .string()
    .trim()
    .min(1, 'Code is required')
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers, and underscores'),
  sortOrder: z.number({ invalid_type_error: 'Enter sort order' }).int().min(0),
});

export type MasterDataFormValues = z.infer<typeof schema>;

interface AddMasterDataModalProps {
  open: boolean;
  category: MasterDataCategory;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: MasterDataFormValues) => void;
}

const CATEGORY_LABELS: Record<MasterDataCategory, string> = {
  expense_category: 'Expense Category',
  payment_mode: 'Payment Mode',
};

function labelToCode(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

export function AddMasterDataModal({
  open,
  category,
  isSubmitting,
  onClose,
  onSubmit,
}: AddMasterDataModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MasterDataFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { label: '', code: '', sortOrder: 0 },
  });

  const label = watch('label');

  useEffect(() => {
    if (open) {
      reset({ label: '', code: '', sortOrder: 0 });
    }
  }, [open, reset]);

  useEffect(() => {
    if (label) {
      setValue('code', labelToCode(label), { shouldValidate: true });
    }
  }, [label, setValue]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">
              Add {CATEGORY_LABELS[category]}
            </h2>
            <p className="mt-1 text-sm text-gray-400">Create a new lookup option</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-gold">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Label</label>
            <input className="input-field" {...register('label')} />
            {errors.label && <p className="mt-1 text-xs text-red-400">{errors.label.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Code</label>
            <input className="input-field font-mono text-sm" {...register('code')} />
            {errors.code && <p className="mt-1 text-xs text-red-400">{errors.code.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Sort Order</label>
            <input
              type="number"
              min="0"
              className="input-field"
              {...register('sortOrder', { valueAsNumber: true })}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

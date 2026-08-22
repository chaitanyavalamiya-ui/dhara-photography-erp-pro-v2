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
  equipment_category: 'Equipment Category',
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
    <div className="dhara-set-modal">
      <div className="dhara-set-modal-card">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2>Add {CATEGORY_LABELS[category]}</h2>
            <p className="dhara-set-modal-sub">Create a new lookup option</p>
          </div>
          <button type="button" onClick={onClose} className="dhara-set-icon-btn" aria-label="Close">
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="dhara-set-form">
          <div>
            <label>Label</label>
            <input className="dhara-set-input" {...register('label')} />
            {errors.label && <p className="dhara-set-err">{errors.label.message}</p>}
          </div>

          <div>
            <label>Code</label>
            <input className="dhara-set-input" {...register('code')} />
            {errors.code && <p className="dhara-set-err">{errors.code.message}</p>}
          </div>

          <div>
            <label>Sort Order</label>
            <input
              type="number"
              min="0"
              className="dhara-set-input"
              {...register('sortOrder', { valueAsNumber: true })}
            />
          </div>

          <div className="dhara-set-form-actions">
            <button type="button" className="dhara-set-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dhara-set-btn is-gold" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

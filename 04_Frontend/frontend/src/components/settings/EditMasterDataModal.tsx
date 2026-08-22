import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { MasterDataItem } from '@/services/settings-service';

const schema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(100),
  sortOrder: z.number({ invalid_type_error: 'Enter sort order' }).int().min(0),
  isActive: z.boolean(),
});

export type EditMasterDataFormValues = z.infer<typeof schema>;

interface EditMasterDataModalProps {
  open: boolean;
  item: MasterDataItem | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: EditMasterDataFormValues) => void;
}

export function EditMasterDataModal({
  open,
  item,
  isSubmitting,
  onClose,
  onSubmit,
}: EditMasterDataModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditMasterDataFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { label: '', sortOrder: 0, isActive: true },
  });

  useEffect(() => {
    if (open && item) {
      reset({ label: item.label, sortOrder: item.sortOrder, isActive: item.isActive });
    }
  }, [open, item, reset]);

  if (!open || !item) return null;

  return (
    <div className="dhara-set-modal">
      <div className="dhara-set-modal-card">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2>Edit Lookup Item</h2>
            <p className="dhara-set-modal-sub">{item.code}</p>
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
            <label>Sort Order</label>
            <input
              type="number"
              min="0"
              className="dhara-set-input"
              {...register('sortOrder', { valueAsNumber: true })}
            />
          </div>

          <label className="dhara-set-check">
            <input type="checkbox" {...register('isActive')} />
            Active
          </label>

          <div className="dhara-set-form-actions">
            <button type="button" className="dhara-set-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dhara-set-btn is-gold" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

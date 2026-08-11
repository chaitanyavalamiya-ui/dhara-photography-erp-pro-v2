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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">Edit Lookup Item</h2>
            <p className="mt-1 font-mono text-xs text-gray-500">{item.code}</p>
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
            <label className="mb-1.5 block text-sm text-gray-300">Sort Order</label>
            <input
              type="number"
              min="0"
              className="input-field"
              {...register('sortOrder', { valueAsNumber: true })}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" className="rounded border-surface-border" {...register('isActive')} />
            Active
          </label>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

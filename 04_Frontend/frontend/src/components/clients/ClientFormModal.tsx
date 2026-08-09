import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Client, ClientFormData } from '@/services/clients-service';
import { ClientFormValues, clientFormSchema } from '@/utils/client-form';

interface ClientFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  client?: Client | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: ClientFormData) => void;
}

function toFormValues(client?: Client | null): ClientFormValues {
  return {
    fullName: client?.fullName ?? '',
    mobile: client?.mobile ?? '',
    whatsapp: client?.whatsapp ?? '',
    email: client?.email ?? '',
    address: client?.address ?? '',
    city: client?.city ?? '',
    dateOfBirth: client?.dateOfBirth ?? '',
    anniversaryDate: client?.anniversaryDate ?? '',
    notes: client?.notes ?? '',
  };
}

export function ClientFormModal({
  open,
  mode,
  client,
  isSubmitting,
  onClose,
  onSubmit,
}: ClientFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: toFormValues(client),
  });

  useEffect(() => {
    if (open) {
      reset(toFormValues(client));
    }
  }, [open, client, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">
              {mode === 'create' ? 'Add Client' : 'Edit Client'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {mode === 'create'
                ? 'Create a new studio client record.'
                : 'Update client contact and profile details.'}
            </p>
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

        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              fullName: values.fullName,
              mobile: values.mobile,
              whatsapp: values.whatsapp || undefined,
              email: values.email || undefined,
              address: values.address || undefined,
              city: values.city || undefined,
              dateOfBirth: values.dateOfBirth || undefined,
              anniversaryDate: values.anniversaryDate || undefined,
              notes: values.notes || undefined,
            }),
          )}
          className="space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Client Name <span className="text-gold">*</span>
              </label>
              <input className="input-field" {...register('fullName')} />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-400">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Mobile <span className="text-gold">*</span>
              </label>
              <input className="input-field" placeholder="9876543210" {...register('mobile')} />
              {errors.mobile && (
                <p className="mt-1 text-xs text-red-400">{errors.mobile.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                WhatsApp Number
              </label>
              <input className="input-field" placeholder="9876543210" {...register('whatsapp')} />
              {errors.whatsapp && (
                <p className="mt-1 text-xs text-red-400">{errors.whatsapp.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
              <input
                className="input-field"
                type="text"
                inputMode="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">City</label>
              <input className="input-field" {...register('city')} />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Address</label>
              <input className="input-field" {...register('address')} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Birthday</label>
              <input className="input-field" type="date" {...register('dateOfBirth')} />
              {errors.dateOfBirth && (
                <p className="mt-1 text-xs text-red-400">{errors.dateOfBirth.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Anniversary
              </label>
              <input className="input-field" type="date" {...register('anniversaryDate')} />
              {errors.anniversaryDate && (
                <p className="mt-1 text-xs text-red-400">{errors.anniversaryDate.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Notes</label>
              <textarea className="input-field min-h-24 resize-y" {...register('notes')} />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add Client' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { StaffMember, StaffFormData } from '@/services/staff-service';
import { StaffFormValues, staffFormSchema } from '@/utils/staff-form-schema';
import { PAYMENT_TYPES, STAFF_ROLES } from '@/utils/staff-form';

interface StaffFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  staff?: StaffMember | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: StaffFormData) => void;
}

function toFormValues(staff?: StaffMember | null): StaffFormValues {
  return {
    fullName: staff?.fullName ?? '',
    mobile: staff?.mobile ?? '',
    email: staff?.email ?? '',
    address: staff?.address ?? '',
    role: staff?.role ?? 'photographer',
    joiningDate: staff?.joiningDate ?? '',
    paymentType: staff?.paymentType ?? 'per_event',
    defaultRate: staff?.defaultRate ?? 0,
    notes: staff?.notes ?? '',
    isActive: staff?.isActive ?? true,
  };
}

export function StaffFormModal({
  open,
  mode,
  staff,
  isSubmitting,
  onClose,
  onSubmit,
}: StaffFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: toFormValues(staff),
  });

  useEffect(() => {
    if (open) {
      reset(toFormValues(staff));
    }
  }, [open, staff, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">
              {mode === 'create' ? 'Add Staff Member' : 'Edit Staff Member'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {mode === 'create'
                ? 'Create a new team member record.'
                : 'Update staff profile and payment details.'}
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
              mobile: values.mobile || undefined,
              email: values.email || undefined,
              address: values.address || undefined,
              role: values.role,
              joiningDate: values.joiningDate || undefined,
              paymentType: values.paymentType,
              defaultRate: values.defaultRate,
              notes: values.notes || undefined,
              isActive: values.isActive,
            }),
          )}
          className="space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Full Name <span className="text-gold">*</span>
              </label>
              <input className="input-field" {...register('fullName')} />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-400">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Mobile</label>
              <input className="input-field" placeholder="9876543210" {...register('mobile')} />
              {errors.mobile && (
                <p className="mt-1 text-xs text-red-400">{errors.mobile.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
              <input className="input-field" type="email" {...register('email')} />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Role <span className="text-gold">*</span>
              </label>
              <select className="input-field" {...register('role')}>
                {STAFF_ROLES.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Joining Date</label>
              <input className="input-field" type="date" {...register('joiningDate')} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Payment Type</label>
              <select className="input-field" {...register('paymentType')}>
                {PAYMENT_TYPES.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Default Rate (₹)</label>
              <input className="input-field" type="number" min={0} step="0.01" {...register('defaultRate')} />
            </div>

            {mode === 'edit' && (
              <div className="flex items-center gap-2 pt-7">
                <input id="isActive" type="checkbox" className="h-4 w-4" {...register('isActive')} />
                <label htmlFor="isActive" className="text-sm text-gray-300">
                  Active staff member
                </label>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Address</label>
              <textarea className="input-field min-h-[80px]" {...register('address')} />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Notes</label>
              <textarea className="input-field min-h-[80px]" {...register('notes')} />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add Staff' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

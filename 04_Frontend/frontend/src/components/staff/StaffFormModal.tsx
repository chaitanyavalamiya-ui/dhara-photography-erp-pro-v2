import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { StaffMember, StaffFormData } from '@/services/staff-service';
import { StaffFormValues, staffFormSchema } from '@/utils/staff-form-schema';
import { PAYMENT_TYPES, STAFF_ROLES } from '@/utils/staff-form';
import '@/pages/staff/staff-page.css';

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
    <div className="dhara-stf-modal">
      <div className="dhara-stf-modal-card is-wide">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2>{mode === 'create' ? 'Add Staff Member' : 'Edit Staff Member'}</h2>
            <p className="dhara-stf-modal-sub">
              {mode === 'create'
                ? 'Create a new team member record.'
                : 'Update staff profile and payment details.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="dhara-stf-icon-btn" aria-label="Close">
            <X />
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
          className="dhara-stf-form"
        >
          <div className="dhara-stf-form-grid">
            <div className="dhara-stf-span-2">
              <label>
                Full Name <span className="dhara-stf-amt is-gold">*</span>
              </label>
              <input className="dhara-stf-input" {...register('fullName')} />
              {errors.fullName && <p className="dhara-stf-err">{errors.fullName.message}</p>}
            </div>

            <div>
              <label>Mobile</label>
              <input className="dhara-stf-input" placeholder="9876543210" {...register('mobile')} />
              {errors.mobile && <p className="dhara-stf-err">{errors.mobile.message}</p>}
            </div>

            <div>
              <label>Email</label>
              <input className="dhara-stf-input" type="email" {...register('email')} />
              {errors.email && <p className="dhara-stf-err">{errors.email.message}</p>}
            </div>

            <div>
              <label>
                Role <span className="dhara-stf-amt is-gold">*</span>
              </label>
              <select className="dhara-stf-input" {...register('role')}>
                {STAFF_ROLES.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Joining Date</label>
              <input className="dhara-stf-input" type="date" {...register('joiningDate')} />
            </div>

            <div>
              <label>Payment Type</label>
              <select className="dhara-stf-input" {...register('paymentType')}>
                {PAYMENT_TYPES.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Default Rate (₹)</label>
              <input
                className="dhara-stf-input"
                type="number"
                min={0}
                step="0.01"
                {...register('defaultRate')}
              />
              {errors.defaultRate && <p className="dhara-stf-err">{errors.defaultRate.message}</p>}
            </div>

            {mode === 'edit' && (
              <label className="dhara-stf-check" htmlFor="isActive">
                <input id="isActive" type="checkbox" {...register('isActive')} />
                Active staff member
              </label>
            )}

            <div className="dhara-stf-span-2">
              <label>Address</label>
              <textarea className="dhara-stf-input" rows={3} {...register('address')} />
            </div>

            <div className="dhara-stf-span-2">
              <label>Notes</label>
              <textarea className="dhara-stf-input" rows={3} {...register('notes')} />
            </div>
          </div>

          <div className="dhara-stf-form-actions">
            <button type="button" className="dhara-stf-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dhara-stf-btn is-gold" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add Staff' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

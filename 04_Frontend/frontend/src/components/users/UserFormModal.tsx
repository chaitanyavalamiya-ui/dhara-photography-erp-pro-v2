import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { AppUser, usersService } from '@/services/users-service';
import { validatePasswordPolicy } from '@/utils/password-policy';

const passwordFieldSchema = z.string().superRefine((value, ctx) => {
  const message = validatePasswordPolicy(value);
  if (message) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }
});

const createSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email'),
  password: passwordFieldSchema,
  roleIds: z.array(z.string()).min(1, 'Select at least one role'),
});

const editSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email'),
  password: z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      if (!value) {
        return;
      }

      const message = validatePasswordPolicy(value);
      if (message) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      }
    }),
  isActive: z.boolean(),
  roleIds: z.array(z.string()).min(1, 'Select at least one role'),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

interface UserFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  user?: AppUser | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateFormValues | EditFormValues) => void;
}

export function UserFormModal({
  open,
  mode,
  user,
  isSubmitting,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const isEdit = mode === 'edit';

  const rolesQuery = useQuery({
    queryKey: ['users', 'roles'],
    queryFn: usersService.getRoles,
    enabled: open,
  });

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { fullName: '', email: '', password: '', roleIds: [] },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { fullName: '', email: '', password: '', isActive: true, roleIds: [] },
  });

  useEffect(() => {
    if (!open) return;

    if (isEdit && user) {
      editForm.reset({
        fullName: user.fullName,
        email: user.email,
        password: '',
        isActive: user.isActive,
        roleIds: user.roles.map((role) => role.id),
      });
    } else {
      const defaultRole = rolesQuery.data?.[0]?.id;
      createForm.reset({
        fullName: '',
        email: '',
        password: '',
        roleIds: defaultRole ? [defaultRole] : [],
      });
    }
  }, [open, isEdit, user, rolesQuery.data, createForm, editForm]);

  if (!open) return null;

  const roles = rolesQuery.data ?? [];

  const toggleRole = (
    roleId: string,
    current: string[],
    setter: (value: string[]) => void,
  ) => {
    if (current.includes(roleId)) {
      if (current.length === 1) return;
      setter(current.filter((id) => id !== roleId));
      return;
    }
    setter([...current, roleId]);
  };

  return (
    <div className="dhara-usr-modal">
      <div className="dhara-usr-modal-card">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2>{isEdit ? 'Edit User' : 'Add User'}</h2>
            <p className="dhara-usr-modal-sub">
              {isEdit ? 'Update account details and roles' : 'Create a new ERP login'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="dhara-usr-icon-btn" aria-label="Close">
            <X />
          </button>
        </div>

        {isEdit ? (
          <form onSubmit={editForm.handleSubmit(onSubmit)} className="dhara-usr-form">
            <div>
              <label>Full Name</label>
              <input className="dhara-usr-input" {...editForm.register('fullName')} />
            </div>
            <div>
              <label>Email</label>
              <input className="dhara-usr-input" {...editForm.register('email')} />
            </div>
            <div>
              <label>New Password</label>
              <input
                type="password"
                className="dhara-usr-input"
                placeholder="Leave blank to keep current"
                autoComplete="new-password"
                {...editForm.register('password')}
              />
              {editForm.formState.errors.password && (
                <p className="dhara-usr-err">{editForm.formState.errors.password.message}</p>
              )}
            </div>
            <label className="dhara-usr-check">
              <input type="checkbox" {...editForm.register('isActive')} />
              Active
            </label>
            <div>
              <label>Roles</label>
              <div className="mt-2 space-y-2">
                {roles.map((role) => (
                  <label key={role.id} className="dhara-usr-check">
                    <input
                      type="checkbox"
                      checked={editForm.watch('roleIds').includes(role.id)}
                      onChange={() =>
                        toggleRole(role.id, editForm.watch('roleIds'), (value) =>
                          editForm.setValue('roleIds', value, { shouldValidate: true }),
                        )
                      }
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="dhara-usr-form-actions">
              <button type="button" className="dhara-usr-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="dhara-usr-btn is-gold" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit(onSubmit)} className="dhara-usr-form">
            <div>
              <label>Full Name</label>
              <input className="dhara-usr-input" {...createForm.register('fullName')} />
            </div>
            <div>
              <label>Email</label>
              <input className="dhara-usr-input" {...createForm.register('email')} />
            </div>
            <div>
              <label>Password</label>
              <input
                type="password"
                className="dhara-usr-input"
                autoComplete="new-password"
                {...createForm.register('password')}
              />
              {createForm.formState.errors.password && (
                <p className="dhara-usr-err">{createForm.formState.errors.password.message}</p>
              )}
            </div>
            <div>
              <label>Roles</label>
              <div className="mt-2 space-y-2">
                {roles.map((role) => (
                  <label key={role.id} className="dhara-usr-check">
                    <input
                      type="checkbox"
                      checked={createForm.watch('roleIds').includes(role.id)}
                      onChange={() =>
                        toggleRole(role.id, createForm.watch('roleIds'), (value) =>
                          createForm.setValue('roleIds', value, { shouldValidate: true }),
                        )
                      }
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="dhara-usr-form-actions">
              <button type="button" className="dhara-usr-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="dhara-usr-btn is-gold" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

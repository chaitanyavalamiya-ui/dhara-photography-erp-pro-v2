import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { AppUser, usersService } from '@/services/users-service';

const createSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleIds: z.array(z.string()).min(1, 'Select at least one role'),
});

const editSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().optional(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[90vh] w-full max-w-md overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">
              {isEdit ? 'Edit User' : 'Add User'}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {isEdit ? 'Update account details and roles' : 'Create a new ERP login'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-gold">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isEdit ? (
          <form onSubmit={editForm.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Full Name</label>
              <input className="input-field" {...editForm.register('fullName')} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Email</label>
              <input className="input-field" {...editForm.register('email')} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">New Password</label>
              <input type="password" className="input-field" placeholder="Leave blank to keep current" {...editForm.register('password')} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" className="rounded border-surface-border" {...editForm.register('isActive')} />
              Active
            </label>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Roles</label>
              <div className="space-y-2">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm text-gray-300">
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
            <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Full Name</label>
              <input className="input-field" {...createForm.register('fullName')} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Email</label>
              <input className="input-field" {...createForm.register('email')} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Password</label>
              <input type="password" className="input-field" {...createForm.register('password')} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Roles</label>
              <div className="space-y-2">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm text-gray-300">
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
            <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

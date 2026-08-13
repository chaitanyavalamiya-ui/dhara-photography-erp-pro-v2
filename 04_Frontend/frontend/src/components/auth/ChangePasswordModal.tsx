import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, X } from 'lucide-react';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { getApiErrorMessage } from '@/utils/api-error';
import {
  PASSWORD_POLICY_MESSAGES,
  validatePasswordPolicy,
} from '@/utils/password-policy';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().superRefine((value, ctx) => {
      const message = validatePasswordPolicy(value);
      if (message) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      }
    }),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: PASSWORD_POLICY_MESSAGES.MISMATCH,
    path: ['confirmPassword'],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ChangePasswordModal({ open, onClose, onSuccess }: ChangePasswordModalProps) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => {
      reset();
      onSuccess?.();
      clearAuth();
      window.location.href = '/login';
    },
  });

  if (!open) {
    return null;
  }

  const handleClose = () => {
    reset();
    changePasswordMutation.reset();
    onClose();
  };

  const serverError = changePasswordMutation.isError
    ? getApiErrorMessage(changePasswordMutation.error, 'Failed to change password.')
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md dhara-modal-enter">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15">
              <KeyRound className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-gold">Change Password</h2>
              <p className="mt-1 text-sm text-gray-400">
                Update your ERP login password. You will be signed out after saving.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 hover:text-gold"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((values) =>
            changePasswordMutation.mutate({
              currentPassword: values.currentPassword,
              newPassword: values.newPassword,
            }),
          )}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Current Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="input-field"
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="input-field"
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Confirm New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="input-field"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="rounded-lg border border-surface-border bg-surface/60 px-4 py-3 text-xs text-gray-500">
            <p>Password must include:</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Minimum 8 characters / ઓછામાં ઓછા 8 અક્ષરો</li>
              <li>One uppercase letter / એક મોટો અક્ષર</li>
              <li>One lowercase letter / એક નાનો અક્ષર</li>
              <li>One number / એક નંબર</li>
            </ul>
          </div>

          {serverError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {serverError.includes('Current password is incorrect')
                ? PASSWORD_POLICY_MESSAGES.CURRENT_INCORRECT
                : serverError}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

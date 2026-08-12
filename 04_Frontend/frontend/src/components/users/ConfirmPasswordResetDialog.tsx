import { AppUser } from '@/services/users-service';

interface ConfirmPasswordResetDialogProps {
  open: boolean;
  user: AppUser | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmPasswordResetDialog({
  open,
  user,
  isSubmitting,
  onClose,
  onConfirm,
}: ConfirmPasswordResetDialogProps) {
  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md">
        <h2 className="font-display text-xl font-semibold text-gold">Reset User Password</h2>
        <p className="mt-3 text-sm text-gray-400">
          Reset the password for <span className="text-gray-200">{user.fullName}</span> (
          {user.email})? The user will be signed out on all devices and must sign in again with the
          new password.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

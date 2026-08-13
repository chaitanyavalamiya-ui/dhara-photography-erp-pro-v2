import { AppUser } from '@/services/users-service';

interface UnlockUserDialogProps {
  open: boolean;
  user: AppUser | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function UnlockUserDialog({
  open,
  user,
  isSubmitting,
  onClose,
  onConfirm,
}: UnlockUserDialogProps) {
  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md">
        <h2 className="font-display text-xl font-semibold text-gold">Unlock User</h2>
        <p className="mt-3 text-sm text-gray-400">
          Unlock <span className="text-gray-200">{user.fullName}</span> ({user.email})? This clears
          the failed-login lock so they can sign in again.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? 'Unlocking...' : 'Unlock User'}
          </button>
        </div>
      </div>
    </div>
  );
}

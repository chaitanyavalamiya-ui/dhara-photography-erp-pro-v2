import { AppUser } from '@/services/users-service';

interface ArchiveUserDialogProps {
  open: boolean;
  user: AppUser | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ArchiveUserDialog({
  open,
  user,
  isSubmitting,
  onClose,
  onConfirm,
}: ArchiveUserDialogProps) {
  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md">
        <h2 className="font-display text-xl font-semibold text-gold">Archive User</h2>
        <p className="mt-3 text-sm text-gray-400">
          Archive <span className="text-gray-200">{user.fullName}</span> ({user.email})? They will
          no longer be able to sign in.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? 'Archiving...' : 'Archive User'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <div className="dhara-usr-modal">
      <div className="dhara-usr-modal-card">
        <h2>Archive User</h2>
        <p className="dhara-usr-modal-sub">
          Archive <span className="dhara-usr-amt is-gold">{user.fullName}</span> ({user.email})? They
          will no longer be able to sign in.
        </p>
        <div className="dhara-usr-form-actions">
          <button type="button" className="dhara-usr-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="dhara-usr-btn is-gold" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? 'Archiving...' : 'Archive User'}
          </button>
        </div>
      </div>
    </div>
  );
}

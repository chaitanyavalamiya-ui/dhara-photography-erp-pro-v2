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
    <div className="dhara-usr-modal">
      <div className="dhara-usr-modal-card">
        <h2>Unlock User</h2>
        <p className="dhara-usr-modal-sub">
          Unlock <span className="dhara-usr-amt is-gold">{user.fullName}</span> ({user.email})? This
          clears the failed-login lock so they can sign in again.
        </p>
        <div className="dhara-usr-form-actions">
          <button type="button" className="dhara-usr-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="dhara-usr-btn is-gold" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? 'Unlocking...' : 'Unlock User'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <div className="dhara-usr-modal" style={{ zIndex: 60 }}>
      <div className="dhara-usr-modal-card">
        <h2>Reset User Password</h2>
        <p className="dhara-usr-modal-sub">
          Reset the password for <span className="dhara-usr-amt is-gold">{user.fullName}</span> (
          {user.email})? The user will be signed out on all devices and must sign in again with the
          new password.
        </p>
        <div className="dhara-usr-form-actions">
          <button type="button" className="dhara-usr-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="dhara-usr-btn is-gold" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

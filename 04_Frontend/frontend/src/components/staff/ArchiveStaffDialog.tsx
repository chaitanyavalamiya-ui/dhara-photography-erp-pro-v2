import { AlertTriangle } from 'lucide-react';
import { StaffMember } from '@/services/staff-service';
import '@/pages/staff/staff-page.css';

interface ArchiveStaffDialogProps {
  open: boolean;
  staff: StaffMember | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ArchiveStaffDialog({
  open,
  staff,
  isSubmitting,
  onClose,
  onConfirm,
}: ArchiveStaffDialogProps) {
  if (!open || !staff) return null;

  return (
    <div className="dhara-stf-modal">
      <div className="dhara-stf-modal-card">
        <div className="mb-4 flex items-start gap-3">
          <span className="dhara-stf-icon is-alert">
            <AlertTriangle />
          </span>
          <div>
            <h2>Archive Staff Member</h2>
            <p className="dhara-stf-modal-sub">
              Archive <span className="dhara-stf-amt is-gold">{staff.fullName}</span> ({staff.staffCode}
              )? This hides them from active lists but keeps assignment and expense history.
            </p>
          </div>
        </div>
        <div className="dhara-stf-form-actions">
          <button type="button" className="dhara-stf-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="dhara-stf-btn is-danger"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Archiving...' : 'Archive Staff'}
          </button>
        </div>
      </div>
    </div>
  );
}

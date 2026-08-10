import { AlertTriangle } from 'lucide-react';
import { StaffMember } from '@/services/staff-service';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-red-500/10 p-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-gray-100">Archive Staff Member</h2>
            <p className="mt-1 text-sm text-gray-400">
              Archive <span className="text-gold">{staff.fullName}</span> ({staff.staffCode})? This
              hides them from active lists but keeps assignment and expense history.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
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

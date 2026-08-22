import { AlertTriangle, X } from 'lucide-react';
import { Album } from '@/services/albums-service';

interface ArchiveAlbumDialogProps {
  open: boolean;
  album: Album | null;
  isArchiving?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ArchiveAlbumDialog({
  open,
  album,
  isArchiving,
  onClose,
  onConfirm,
}: ArchiveAlbumDialogProps) {
  if (!open || !album) return null;

  return (
    <div className="dhara-alb-modal is-archive">
      <div className="dhara-alb-dialog">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="dhara-alb-icon is-warn">
              <AlertTriangle strokeWidth={2.35} absoluteStrokeWidth />
            </span>
            <div>
              <h2>Archive Album</h2>
              <p>
                Are you sure you want to archive <span style={{ color: '#ffd45a' }}>{album.name}</span>?
                The album will be hidden from the active list. Photos and financial records are
                preserved.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="dhara-alb-icon-btn" aria-label="Close">
            <X strokeWidth={2.4} absoluteStrokeWidth />
          </button>
        </div>

        <div className="dhara-alb-form-actions">
          <button type="button" className="dhara-alb-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="dhara-alb-btn is-danger"
            onClick={onConfirm}
            disabled={isArchiving}
          >
            {isArchiving ? 'Archiving...' : 'Archive Album'}
          </button>
        </div>
      </div>
    </div>
  );
}

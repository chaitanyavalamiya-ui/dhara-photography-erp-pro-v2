import { AlertTriangle, X } from 'lucide-react';
import { Gallery } from '@/services/galleries-service';

interface ArchiveGalleryDialogProps {
  open: boolean;
  gallery: Gallery | null;
  isArchiving?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ArchiveGalleryDialog({
  open,
  gallery,
  isArchiving,
  onClose,
  onConfirm,
}: ArchiveGalleryDialogProps) {
  if (!open || !gallery) return null;

  return (
    <div className="dhara-gal-modal is-archive">
      <div className="dhara-gal-dialog">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="dhara-gal-icon" style={{ color: '#fecaca', borderColor: 'rgba(248,113,113,0.5)' }}>
              <AlertTriangle strokeWidth={2.4} absoluteStrokeWidth />
            </span>
            <div>
              <h2>Archive Gallery</h2>
              <p className="dhara-gal-dialog-copy">
                Archive <span style={{ color: '#ffd45a' }}>{gallery.name}</span>? It will leave the
                active list. Photo files stay on disk, and linked albums keep their history.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="dhara-gal-icon-btn" aria-label="Close">
            <X strokeWidth={2.4} absoluteStrokeWidth />
          </button>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" className="dhara-gal-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="dhara-gal-btn is-danger"
            onClick={onConfirm}
            disabled={isArchiving}
          >
            {isArchiving ? 'Archiving...' : 'Archive Gallery'}
          </button>
        </div>
      </div>
    </div>
  );
}

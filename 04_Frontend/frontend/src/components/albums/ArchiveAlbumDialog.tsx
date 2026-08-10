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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-gray-100">Archive Album</h2>
              <p className="mt-1 text-sm text-gray-400">
                Are you sure you want to archive{' '}
                <span className="text-gold">{album.name}</span>? The album will be hidden from the
                active list. Photos and financial records are preserved.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
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

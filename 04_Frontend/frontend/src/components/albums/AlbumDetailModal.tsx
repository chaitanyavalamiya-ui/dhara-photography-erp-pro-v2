import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ImageOff, Pencil, X } from 'lucide-react';
import { Album, albumsService } from '@/services/albums-service';
import { GalleryPhoto, galleriesService } from '@/services/galleries-service';
import { GalleryPhotoImage } from '@/components/gallery/GalleryPhotoImage';
import {
  ALBUM_PRODUCTION_STAGES,
  albumStatusLabel,
  albumStatusTone,
  albumTypeLabel,
} from '@/components/albums/album-visual';
import { formatCurrency } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

interface AlbumDetailModalProps {
  open: boolean;
  album: Album | null;
  canUpdate?: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AlbumDetailModal({
  open,
  album,
  canUpdate,
  onClose,
  onEdit,
}: AlbumDetailModalProps) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [photoPage, setPhotoPage] = useState(1);
  const [loadedPhotos, setLoadedPhotos] = useState<GalleryPhoto[]>([]);

  const galleryArchived = Boolean(album?.galleryArchived);
  const galleryQuery = useQuery({
    queryKey: ['galleries', album?.galleryId, 'album-detail', photoPage],
    queryFn: () => galleriesService.listPhotos(album!.galleryId!, { page: photoPage, limit: 40 }),
    enabled: open && !!album?.galleryId && !galleryArchived,
  });

  useEffect(() => {
    if (!open || !album?.galleryId) {
      setPhotoPage(1);
      setLoadedPhotos([]);
      return;
    }
    setPhotoPage(1);
    setLoadedPhotos([]);
  }, [open, album?.galleryId]);

  useEffect(() => {
    const pageData = galleryQuery.data;
    if (!pageData) return;
    setLoadedPhotos((current) => {
      if (pageData.page === 1) {
        return pageData.items;
      }
      const seen = new Set(current.map((photo) => photo.id));
      return [...current, ...pageData.items.filter((photo) => !seen.has(photo.id))];
    });
  }, [galleryQuery.data]);

  const selectedPhotoIds = useMemo(
    () => new Set((album?.photos ?? []).map((p) => p.galleryPhotoId)),
    [album?.photos],
  );

  const selectedCount = selectedPhotoIds.size;
  const totalGalleryPhotos = galleryQuery.data?.total ?? loadedPhotos.length;

  const invalidateAlbumQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['albums'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    if (album) {
      queryClient.invalidateQueries({ queryKey: ['albums', album.id] });
    }
  };

  const toggleMutation = useMutation({
    mutationFn: async (galleryPhotoId: string) => {
      if (!album) return;
      if (selectedPhotoIds.has(galleryPhotoId)) {
        await albumsService.removePhoto(album.id, galleryPhotoId);
      } else {
        await albumsService.addPhotos(album.id, [galleryPhotoId]);
      }
    },
    onSuccess: () => {
      invalidateAlbumQueries();
      setFeedback({ type: 'success', message: 'Photo selection updated.' });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Failed to update selection.') });
    },
  });

  const selectAllMutation = useMutation({
    mutationFn: () => albumsService.selectAllPhotos(album!.id),
    onSuccess: () => {
      invalidateAlbumQueries();
      setFeedback({ type: 'success', message: 'All gallery photos selected.' });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Failed to select all photos.') });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => albumsService.clearAllPhotos(album!.id),
    onSuccess: () => {
      invalidateAlbumQueries();
      setFeedback({ type: 'success', message: 'Photo selection cleared.' });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Failed to clear selection.') });
    },
  });

  const bulkPending = selectAllMutation.isPending || clearAllMutation.isPending;

  if (!open) return null;

  if (!album) {
    return (
      <div className="dhara-alb-modal">
        <div className="dhara-alb-modal-card" style={{ maxWidth: '28rem' }}>
          <p className="dhara-alb-modal-sub" style={{ textAlign: 'center' }}>Loading album...</p>
          <button type="button" className="dhara-alb-btn mt-4" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const galleryPhotos = loadedPhotos;
  const unavailablePhotos = (album.photos ?? []).filter((photo) => photo.available === false);
  const hasMorePhotos = (galleryQuery.data?.page ?? 1) < (galleryQuery.data?.totalPages ?? 1);
  const currentStageIndex = ALBUM_PRODUCTION_STAGES.indexOf(
    album.status as (typeof ALBUM_PRODUCTION_STAGES)[number],
  );

  return (
    <div className="dhara-alb-modal">
      <div className="dhara-alb-modal-card is-wide">
        <div className="dhara-alb-modal-head">
          <div>
            <p className="dhara-alb-kicker" style={{ fontSize: '0.82rem' }}>{album.bookingNumber}</p>
            <h2>{album.name}</h2>
            <p className="dhara-alb-modal-sub">
              {album.clientName} · {album.galleryName ?? 'No gallery linked'}
            </p>
          </div>
          <div className="dhara-alb-modal-actions">
            {canUpdate && onEdit && (
              <button type="button" className="dhara-alb-btn is-cyan" onClick={onEdit}>
                <Pencil strokeWidth={2.4} absoluteStrokeWidth />
                Edit
              </button>
            )}
            <button type="button" onClick={onClose} className="dhara-alb-icon-btn" aria-label="Close">
              <X strokeWidth={2.4} absoluteStrokeWidth />
            </button>
          </div>
        </div>

        <div className="dhara-alb-modal-body">
          {feedback && (
            <div className={cn('dhara-alb-flash mb-4', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
              {feedback.message}
            </div>
          )}

          {album.status === 'cancelled' ? (
            <div className="dhara-alb-flow">
              <span className={cn('dhara-alb-status', albumStatusTone(album.status))}>
                {albumStatusLabel(album.status)}
              </span>
            </div>
          ) : (
            <div className="dhara-alb-flow" aria-label="Album production status">
              {ALBUM_PRODUCTION_STAGES.map((stage, index) => (
                <span
                  key={stage}
                  className={cn(
                    'dhara-alb-flow-step',
                    index < currentStageIndex && 'is-done',
                    index === currentStageIndex && 'is-current',
                  )}
                >
                  {albumStatusLabel(stage)}
                </span>
              ))}
            </div>
          )}

          <div className="dhara-alb-stats">
            <div className="dhara-alb-stat">
              <span>Status</span>
              <strong>
                <span className={cn('dhara-alb-status', albumStatusTone(album.status))}>
                  {albumStatusLabel(album.status)}
                </span>
              </strong>
            </div>
            <div className="dhara-alb-stat">
              <span>Selling Price</span>
              <strong>{formatCurrency(album.albumPrice)}</strong>
            </div>
            <div className="dhara-alb-stat">
              <span>Vendor Expense</span>
              <strong>{formatCurrency(album.vendorExpense)}</strong>
            </div>
            <div className="dhara-alb-stat">
              <span>Album Profit</span>
              <strong>{formatCurrency(album.profit)}</strong>
            </div>
          </div>

          <div className="dhara-alb-facts">
            <p>Type: <b>{albumTypeLabel(album.albumType)}</b></p>
            <p>Pages: <b>{album.pageCount}</b></p>
            <p>Selected Photos: <b>{album.selectedPhotoCount}</b></p>
            <p>Order Date: <b>{formatDate(album.orderDate)}</b></p>
            <p>Expected Delivery: <b>{formatDate(album.expectedDeliveryDate)}</b></p>
            <p>Actual Delivery: <b>{formatDate(album.actualDeliveryDate)}</b></p>
            <p>Vendor: <b>{album.vendorName || '—'}</b></p>
          </div>

          {album.notes && <div className="dhara-alb-notes">{album.notes}</div>}

          <div className="dhara-alb-section-head">
            <h3>Gallery Photo Selection</h3>
            <div className="flex flex-wrap items-center gap-2">
              <p className="dhara-alb-hint" style={{ margin: 0 }}>
                {selectedCount} of {totalGalleryPhotos || album.selectedPhotoCount} selected
              </p>
              {canUpdate && album.galleryId && galleryPhotos.length > 0 && (
                <>
                  <button
                    type="button"
                    className="dhara-alb-btn"
                    disabled={bulkPending || toggleMutation.isPending}
                    onClick={() => selectAllMutation.mutate()}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="dhara-alb-btn"
                    disabled={bulkPending || toggleMutation.isPending || selectedCount === 0}
                    onClick={() => clearAllMutation.mutate()}
                  >
                    Clear all
                  </button>
                </>
              )}
            </div>
          </div>

          {!album.galleryId ? (
            <div className="dhara-alb-empty" style={{ minHeight: '12rem' }}>
              <ImageOff strokeWidth={2.35} absoluteStrokeWidth />
              <p>No gallery linked. Edit the album to connect a gallery.</p>
            </div>
          ) : galleryArchived ? (
            <div className="dhara-alb-notes">
              The linked gallery is archived. Historical photo selection is preserved and cannot be changed
              until a new active gallery is linked.
              {(album.photos ?? []).length > 0 && (
                <ul className="mt-3 space-y-1">
                  {(album.photos ?? []).map((photo) => (
                    <li key={photo.id}>{photo.originalName}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : galleryQuery.isLoading && galleryPhotos.length === 0 ? (
            <p className="dhara-alb-hint">Loading gallery photos...</p>
          ) : galleryQuery.isError ? (
            <p className="dhara-alb-error-text">
              {getApiErrorMessage(galleryQuery.error, 'Failed to load gallery photos.')}
            </p>
          ) : galleryPhotos.length === 0 ? (
            <div className="dhara-alb-empty" style={{ minHeight: '12rem' }}>
              <ImageOff strokeWidth={2.35} absoluteStrokeWidth />
              <p>No photos in the linked gallery yet.</p>
            </div>
          ) : (
            <>
              <div className="dhara-alb-photos">
                {galleryPhotos.map((photo) => {
                  const isSelected = selectedPhotoIds.has(photo.id);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      disabled={!canUpdate || toggleMutation.isPending || bulkPending}
                      onClick={() => toggleMutation.mutate(photo.id)}
                      className={cn('dhara-alb-photo', isSelected && 'is-on')}
                    >
                      <GalleryPhotoImage
                        galleryId={album.galleryId!}
                        photoId={photo.id}
                        alt={photo.originalName}
                        variant="thumbnail"
                        className="aspect-square w-full"
                      />
                      {isSelected && (
                        <span className="dhara-alb-check">
                          <Check strokeWidth={2.6} absoluteStrokeWidth />
                        </span>
                      )}
                      <p className="dhara-alb-photo-name">{photo.originalName}</p>
                    </button>
                  );
                })}
              </div>
              {hasMorePhotos && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    className="dhara-alb-btn"
                    disabled={galleryQuery.isFetching}
                    onClick={() => setPhotoPage((page) => page + 1)}
                  >
                    {galleryQuery.isFetching ? 'Loading...' : 'Load more photos'}
                  </button>
                </div>
              )}
              {unavailablePhotos.length > 0 && (
                <div className="dhara-alb-notes mt-4">
                  {unavailablePhotos.length} selected photo
                  {unavailablePhotos.length === 1 ? '' : 's'} were removed from the gallery and are no longer
                  shown above. Album history is kept.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

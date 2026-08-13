import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ImageOff, Pencil, X } from 'lucide-react';
import { Album, albumsService } from '@/services/albums-service';
import { GalleryPhoto, galleriesService } from '@/services/galleries-service';
import { GalleryPhotoImage } from '@/components/gallery/GalleryPhotoImage';
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

function statusBadgeClass(status: string) {
  switch (status) {
    case 'designing':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'printing':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'ready':
      return 'bg-green-500/15 text-green-400 border-green-500/30';
    case 'delivered':
      return 'bg-gold/15 text-gold border-gold/30';
    case 'cancelled':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  }
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="card w-full max-w-md text-center">
          <p className="text-sm text-gray-400">Loading album...</p>
          <button type="button" className="btn-secondary mt-4" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const galleryPhotos = loadedPhotos;
  const unavailablePhotos = (album.photos ?? []).filter((photo) => photo.available === false);
  const hasMorePhotos = (galleryQuery.data?.page ?? 1) < (galleryQuery.data?.totalPages ?? 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-card">
        <div className="flex items-start justify-between gap-4 border-b border-surface-border px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">{album.bookingNumber}</p>
            <h2 className="font-display text-xl font-semibold text-gold">{album.name}</h2>
            <p className="text-sm text-gray-400">
              {album.clientName} · {album.galleryName ?? 'No gallery linked'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canUpdate && onEdit && (
              <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={onEdit}>
                <Pencil className="mr-1.5 inline h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-gold">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {feedback && (
            <div
              className={cn(
                'mb-4 rounded-lg border px-4 py-3 text-sm',
                feedback.type === 'success'
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400',
              )}
            >
              {feedback.message}
            </div>
          )}

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-surface-border bg-surface-elevated p-4">
              <p className="text-xs text-gray-500">Status</p>
              <span
                className={cn(
                  'mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
                  statusBadgeClass(album.status),
                )}
              >
                {album.status}
              </span>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-elevated p-4">
              <p className="text-xs text-gray-500">Selling Price</p>
              <p className="mt-1 text-lg font-semibold text-gray-100">{formatCurrency(album.albumPrice)}</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-elevated p-4">
              <p className="text-xs text-gray-500">Vendor Expense</p>
              <p className="mt-1 text-lg font-semibold text-gray-100">{formatCurrency(album.vendorExpense)}</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-elevated p-4">
              <p className="text-xs text-gray-500">Album Profit</p>
              <p className="mt-1 text-lg font-semibold text-gold">{formatCurrency(album.profit)}</p>
            </div>
          </div>

          <div className="mb-6 grid gap-4 text-sm text-gray-400 sm:grid-cols-2 lg:grid-cols-3">
            <p>Type: <span className="text-gray-200 capitalize">{album.albumType}</span></p>
            <p>Pages: <span className="text-gray-200">{album.pageCount}</span></p>
            <p>Selected Photos: <span className="text-gray-200">{album.selectedPhotoCount}</span></p>
            <p>Order Date: <span className="text-gray-200">{formatDate(album.orderDate)}</span></p>
            <p>Expected Delivery: <span className="text-gray-200">{formatDate(album.expectedDeliveryDate)}</span></p>
            <p>Actual Delivery: <span className="text-gray-200">{formatDate(album.actualDeliveryDate)}</span></p>
            <p>Vendor: <span className="text-gray-200">{album.vendorName || '—'}</span></p>
          </div>

          {album.notes && (
            <div className="mb-6 rounded-lg border border-surface-border bg-surface-elevated p-4 text-sm text-gray-300">
              {album.notes}
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium text-gray-200">Gallery Photo Selection</h3>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-gray-500">
                {selectedCount} of {totalGalleryPhotos || album.selectedPhotoCount} selected
              </p>
              {canUpdate && album.galleryId && galleryPhotos.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn-secondary px-2 py-1 text-xs"
                    disabled={bulkPending || toggleMutation.isPending}
                    onClick={() => selectAllMutation.mutate()}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-2 py-1 text-xs"
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
            <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-surface-border text-center">
              <ImageOff className="h-10 w-10 text-gray-600" />
              <p className="mt-3 text-sm text-gray-400">No gallery linked. Edit the album to connect a gallery.</p>
            </div>
          ) : galleryArchived ? (
            <div className="rounded-lg border border-dashed border-surface-border p-4 text-sm text-gray-400">
              The linked gallery is archived. Historical photo selection is preserved and cannot be changed
              until a new active gallery is linked.
              {(album.photos ?? []).length > 0 && (
                <ul className="mt-3 space-y-1 text-xs">
                  {(album.photos ?? []).map((photo) => (
                    <li key={photo.id}>{photo.originalName}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : galleryQuery.isLoading && galleryPhotos.length === 0 ? (
            <p className="text-sm text-gray-400">Loading gallery photos...</p>
          ) : galleryQuery.isError ? (
            <p className="text-sm text-red-400">
              {getApiErrorMessage(galleryQuery.error, 'Failed to load gallery photos.')}
            </p>
          ) : galleryPhotos.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-surface-border text-center">
              <ImageOff className="h-10 w-10 text-gray-600" />
              <p className="mt-3 text-sm text-gray-400">No photos in the linked gallery yet.</p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {galleryPhotos.map((photo) => {
                const isSelected = selectedPhotoIds.has(photo.id);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    disabled={!canUpdate || toggleMutation.isPending || bulkPending}
                    onClick={() => toggleMutation.mutate(photo.id)}
                    className={cn(
                      'group relative overflow-hidden rounded-lg border text-left transition',
                      isSelected ? 'border-gold ring-1 ring-gold/40' : 'border-surface-border',
                    )}
                  >
                    <GalleryPhotoImage
                      galleryId={album.galleryId!}
                      photoId={photo.id}
                      alt={photo.originalName}
                      variant="thumbnail"
                      className="aspect-square w-full"
                    />
                    {isSelected && (
                      <span className="absolute left-2 top-2 rounded-full bg-gold p-1 text-maroon-dark">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="truncate text-[10px] text-gray-200">{photo.originalName}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {hasMorePhotos && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  disabled={galleryQuery.isFetching}
                  onClick={() => setPhotoPage((page) => page + 1)}
                >
                  {galleryQuery.isFetching ? 'Loading...' : 'Load more photos'}
                </button>
              </div>
            )}
            {unavailablePhotos.length > 0 && (
              <div className="mt-4 rounded-lg border border-surface-border p-3 text-xs text-gray-400">
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

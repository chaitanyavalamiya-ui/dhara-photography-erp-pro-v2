import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, RotateCcw, Trash2, Upload, X, ZoomIn } from 'lucide-react';
import {
  Gallery,
  GalleryPhoto,
  canViewOriginalPhoto,
  galleriesService,
} from '@/services/galleries-service';
import { useAuthStore } from '@/stores/auth-store';
import { GalleryPhotoImage } from '@/components/gallery/GalleryPhotoImage';
import { GalleryLightbox } from '@/components/gallery/GalleryLightbox';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';
import {
  GalleryUploadItem,
  galleryFileTooLargeMessage,
  isGalleryUploadOversize,
} from '@/utils/gallery-upload';

const PHOTO_PAGE_SIZE = 40;

interface GalleryDetailModalProps {
  open: boolean;
  gallery: Gallery | null;
  canUpdate?: boolean;
  canArchive?: boolean;
  onClose: () => void;
  onArchive?: () => void;
}

export function GalleryDetailModal({
  open,
  gallery,
  canUpdate,
  canArchive,
  onClose,
  onArchive,
}: GalleryDetailModalProps) {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadQueueRef = useRef<GalleryUploadItem[]>([]);
  const uploadingRef = useRef(false);
  const [uploadItems, setUploadItems] = useState<GalleryUploadItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [photoPage, setPhotoPage] = useState(1);
  const [loadedPhotos, setLoadedPhotos] = useState<GalleryPhoto[]>([]);

  const photosQuery = useQuery({
    queryKey: ['galleries', gallery?.id, 'photos', photoPage],
    queryFn: () => galleriesService.listPhotos(gallery!.id, { page: photoPage, limit: PHOTO_PAGE_SIZE }),
    enabled: open && !!gallery,
  });

  useEffect(() => {
    if (!open || !gallery) {
      setPhotoPage(1);
      setLoadedPhotos([]);
      return;
    }
    setPhotoPage(1);
    setLoadedPhotos([]);
  }, [open, gallery?.id]);

  useEffect(() => {
    const pageData = photosQuery.data;
    if (!pageData) return;
    setLoadedPhotos((current) => {
      if (pageData.page === 1) {
        return pageData.items;
      }
      const seen = new Set(current.map((photo) => photo.id));
      return [...current, ...pageData.items.filter((photo) => !seen.has(photo.id))];
    });
  }, [photosQuery.data]);

  const syncUploadItems = (next: GalleryUploadItem[]) => {
    uploadQueueRef.current = next;
    setUploadItems(next);
  };

  const patchUploadItem = (id: string, patch: Partial<GalleryUploadItem>) => {
    syncUploadItems(
      uploadQueueRef.current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const processUploadQueue = async () => {
    if (uploadingRef.current || !gallery) return;
    uploadingRef.current = true;
    try {
      while (true) {
        const next = uploadQueueRef.current.find((item) => item.status === 'pending');
        if (!next) break;
        patchUploadItem(next.id, { status: 'uploading', progress: 0, error: undefined });
        try {
          await galleriesService.uploadPhoto(gallery.id, next.file, (percent) => {
            patchUploadItem(next.id, { progress: percent });
          });
          patchUploadItem(next.id, { status: 'uploaded', progress: 100 });
          queryClient.invalidateQueries({ queryKey: ['galleries'] });
          setPhotoPage(1);
        } catch (error) {
          patchUploadItem(next.id, {
            status: 'failed',
            progress: 0,
            error: getApiErrorMessage(error, 'Upload failed.'),
          });
        }
      }
    } finally {
      uploadingRef.current = false;
      const items = uploadQueueRef.current;
      const uploaded = items.filter((item) => item.status === 'uploaded').length;
      const failed = items.filter((item) => item.status === 'failed').length;
      if (failed && uploaded) {
        setFeedback({
          type: 'error',
          message: `${uploaded} photo(s) uploaded. ${failed} failed.`,
        });
      } else if (failed) {
        setFeedback({ type: 'error', message: `${failed} photo(s) failed to upload.` });
      } else if (uploaded) {
        setFeedback({ type: 'success', message: 'Photos uploaded successfully.' });
      }
      if (items.some((item) => item.status === 'pending')) {
        void processUploadQueue();
      }
    }
  };

  const enqueueFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const added: GalleryUploadItem[] = Array.from(fileList).map((file, index) => {
      const oversize = isGalleryUploadOversize(file);
      return {
        id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`,
        file,
        status: oversize ? 'failed' : 'pending',
        progress: 0,
        error: oversize ? galleryFileTooLargeMessage() : undefined,
      };
    });
    syncUploadItems([...uploadQueueRef.current, ...added]);
    void processUploadQueue();
  };

  const retryFailedUpload = (id: string) => {
    const item = uploadQueueRef.current.find((entry) => entry.id === id);
    if (!item) return;
    if (isGalleryUploadOversize(item.file)) {
      patchUploadItem(id, { status: 'failed', error: galleryFileTooLargeMessage() });
      return;
    }
    patchUploadItem(id, { status: 'pending', progress: 0, error: undefined });
    void processUploadQueue();
  };

  useEffect(() => {
    if (open) return;
    uploadingRef.current = false;
    uploadQueueRef.current = [];
    setUploadItems([]);
  }, [open]);

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => galleriesService.deletePhoto(gallery!.id, photoId),
    onSuccess: (_data, photoId) => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      setLoadedPhotos((current) => current.filter((photo) => photo.id !== photoId));
      setLightboxIndex(null);
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Delete failed.') });
    },
  });

  if (!open) return null;

  if (!gallery) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="card w-full max-w-md text-center">
          <p className="text-sm text-gray-400">Loading gallery...</p>
          <button type="button" className="btn-secondary mt-4" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const photos = loadedPhotos;
  const totalPhotos = photosQuery.data?.total ?? gallery.photoCount;
  const hasMore = (photosQuery.data?.page ?? 1) < (photosQuery.data?.totalPages ?? 1);
  const viewOriginal = canViewOriginalPhoto(gallery.allowClientDownload, hasPermission);

  const handleFiles = (fileList: FileList | null) => {
    enqueueFiles(fileList);
  };

  const isUploading = uploadItems.some((item) => item.status === 'uploading' || item.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-card">
        <div className="flex items-start justify-between gap-4 border-b border-surface-border px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">{gallery.bookingNumber}</p>
            <h2 className="font-display text-xl font-semibold text-gold">{gallery.name}</h2>
            <p className="text-sm text-gray-400">
              {gallery.clientName} · {gallery.eventType} · {totalPhotos} photos
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canUpdate && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="btn-primary px-3 py-1.5 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1.5 inline h-3.5 w-3.5" />
                  Upload Photos
                </button>
              </>
            )}
            {canArchive && onArchive && (
              <button type="button" className="btn-secondary px-3 py-1.5 text-xs text-red-400" onClick={onArchive}>
                Archive
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

          {uploadItems.length > 0 && (
            <div className="mb-4 space-y-2 rounded-lg border border-surface-border bg-surface-elevated p-3">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                {isUploading ? 'Uploading originals…' : 'Upload status'}
              </p>
              {uploadItems.map((item) => (
                <div key={item.id} className="rounded-md border border-surface-border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-gray-200">{item.file.name}</p>
                    <span
                      className={cn(
                        'shrink-0 text-[10px] uppercase tracking-wide',
                        item.status === 'uploaded' && 'text-green-400',
                        item.status === 'failed' && 'text-red-400',
                        item.status === 'uploading' && 'text-gold',
                        item.status === 'pending' && 'text-gray-400',
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                  {item.status === 'uploading' && (
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-card">
                      <div className="h-full bg-gold transition-all" style={{ width: `${item.progress}%` }} />
                    </div>
                  )}
                  {item.status === 'failed' && (
                    <div className="mt-1 flex items-start justify-between gap-2">
                      <p className="text-[11px] text-red-400">{item.error ?? 'Upload failed.'}</p>
                      <button
                        type="button"
                        className="shrink-0 text-[11px] text-gold hover:underline"
                        onClick={() => retryFailedUpload(item.id)}
                      >
                        <RotateCcw className="mr-1 inline h-3 w-3" />
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {photosQuery.isError ? (
            <div className="rounded-lg border border-red-500/30 p-4 text-sm text-red-400">
              {getApiErrorMessage(photosQuery.error, 'Failed to load photos.')}
            </div>
          ) : photosQuery.isLoading && photos.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="aspect-square animate-pulse rounded-lg bg-surface-elevated" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-surface-border text-center">
              <ImagePlus className="h-12 w-12 text-gray-600" />
              <p className="mt-3 text-sm text-gray-400">No photos yet. Upload images to start this gallery.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="group relative overflow-hidden rounded-lg border border-surface-border bg-surface-elevated"
                  >
                    <GalleryPhotoImage
                      galleryId={gallery.id}
                      photoId={photo.id}
                      alt={photo.originalName}
                      variant="thumbnail"
                      className="aspect-square w-full cursor-pointer"
                      onClick={() => setLightboxIndex(index)}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      <p className="truncate text-xs text-gray-200">{photo.originalName}</p>
                      <div className="mt-1 flex gap-1">
                        <button
                          type="button"
                          className="rounded bg-black/40 p-1 text-gray-200 hover:text-gold"
                          onClick={() => setLightboxIndex(index)}
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                        {canUpdate && (
                          <button
                            type="button"
                            className="rounded bg-black/40 p-1 text-gray-200 hover:text-red-400"
                            onClick={() => deleteMutation.mutate(photo.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {photo.clientSelected && (
                      <span className="absolute left-2 top-2 rounded bg-gold/90 px-1.5 py-0.5 text-[10px] font-semibold text-maroon-dark">
                        Selected
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={photosQuery.isFetching}
                    onClick={() => setPhotoPage((page) => page + 1)}
                  >
                    {photosQuery.isFetching ? 'Loading...' : 'Load more photos'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {lightboxIndex !== null && lightboxIndex >= 0 && (
        <GalleryLightbox
          open
          galleryId={gallery.id}
          photos={photos}
          initialIndex={lightboxIndex}
          viewOriginal={viewOriginal}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

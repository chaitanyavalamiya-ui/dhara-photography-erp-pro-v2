import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, RotateCcw, Trash2, Upload, X, ZoomIn } from 'lucide-react';
import {
  GALLERY_STATUS_OPTIONS,
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
  const [dragOver, setDragOver] = useState(false);

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

  const updateMutation = useMutation({
    mutationFn: (payload: { status?: Gallery['status']; allowClientDownload?: boolean }) =>
      galleriesService.update(gallery!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      setFeedback({ type: 'success', message: 'Gallery settings saved.' });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Failed to update gallery.') });
    },
  });

  if (!open) return null;

  if (!gallery) {
    return (
      <div className="dhara-gal-modal">
        <div className="dhara-gal-modal-card text-center">
          <p className="dhara-gal-modal-sub">Loading gallery...</p>
          <button type="button" className="dhara-gal-btn mt-4" onClick={onClose}>
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
    <div className="dhara-gal-modal is-detail">
      <div className="dhara-gal-modal-card is-wide" style={{ maxHeight: '96vh' }}>
        <div className="dhara-gal-modal-head">
          <div>
            <p>{gallery.bookingNumber}</p>
            <h2>{gallery.name}</h2>
            <p className="dhara-gal-modal-sub">
              {gallery.clientName} · {gallery.eventType} · {totalPhotos} photos
            </p>
            {canUpdate && (
              <div className="dhara-gal-settings">
                <label>
                  Status
                  <select
                    className="input-field"
                    style={{ marginLeft: '0.5rem', width: '11rem' }}
                    value={gallery.status}
                    disabled={updateMutation.isPending}
                    onChange={(event) =>
                      updateMutation.mutate({
                        status: event.target.value as Gallery['status'],
                      })
                    }
                  >
                    {GALLERY_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={gallery.allowClientDownload}
                    disabled={updateMutation.isPending}
                    onChange={(event) =>
                      updateMutation.mutate({ allowClientDownload: event.target.checked })
                    }
                  />
                  Allow client download
                </label>
              </div>
            )}
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
                  className="dhara-gal-btn is-gold"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload strokeWidth={2.4} absoluteStrokeWidth />
                  Upload Photos
                </button>
              </>
            )}
            {canArchive && onArchive && (
              <button type="button" className="dhara-gal-btn is-danger" onClick={onArchive}>
                Archive
              </button>
            )}
            <button type="button" onClick={onClose} className="dhara-gal-icon-btn" aria-label="Close">
              <X strokeWidth={2.4} absoluteStrokeWidth />
            </button>
          </div>
        </div>

        <div className="dhara-gal-modal-body">
          {feedback && (
            <div className={cn('dhara-gal-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
              {feedback.message}
            </div>
          )}

          {canUpdate && (
            <div
              className={cn('dhara-gal-drop', dragOver && 'is-over')}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                handleFiles(event.dataTransfer.files);
              }}
            >
              <Upload strokeWidth={2.4} absoluteStrokeWidth />
              <p>Drop photos here or use Upload Photos</p>
              <small>JPEG, PNG, WebP or GIF · real upload progress shown below</small>
            </div>
          )}

          {uploadItems.length > 0 && (
            <div className="dhara-gal-upload-list">
              <p className="dhara-gal-kicker" style={{ fontSize: '0.82rem' }}>
                {isUploading ? 'Uploading originals…' : 'Upload status'}
              </p>
              {uploadItems.map((item) => (
                <div key={item.id} className="dhara-gal-upload-item">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-bold text-[#fffdf8]">{item.file.name}</p>
                    <span
                      className={cn(
                        'shrink-0 text-[0.78rem] uppercase tracking-wide',
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
                    <div className="dhara-gal-progress">
                      <span style={{ width: `${item.progress}%` }} />
                    </div>
                  )}
                  {item.status === 'failed' && (
                    <div className="mt-1 flex items-start justify-between gap-2">
                      <p className="dhara-gal-hint">{item.error ?? 'Upload failed.'}</p>
                      <button
                        type="button"
                        className="dhara-gal-btn"
                        style={{ minHeight: '2.4rem', padding: '0.3rem 0.7rem' }}
                        onClick={() => retryFailedUpload(item.id)}
                      >
                        <RotateCcw strokeWidth={2.4} absoluteStrokeWidth />
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {photosQuery.isError ? (
            <div className="dhara-gal-error">
              <p>{getApiErrorMessage(photosQuery.error, 'Failed to load photos.')}</p>
            </div>
          ) : photosQuery.isLoading && photos.length === 0 ? (
            <div className="dhara-gal-photos">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="dhara-gal-thumb dhara-gal-skeleton" style={{ minHeight: '9.5rem' }} />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="dhara-gal-empty" style={{ minHeight: '14rem' }}>
              <ImagePlus strokeWidth={2.4} absoluteStrokeWidth />
              <p>No photos yet. Upload images to start this gallery.</p>
            </div>
          ) : (
            <>
              <div className="dhara-gal-photos">
                {photos.map((photo, index) => (
                  <div key={photo.id} className="dhara-gal-thumb">
                    <GalleryPhotoImage
                      galleryId={gallery.id}
                      photoId={photo.id}
                      alt={photo.originalName}
                      variant="thumbnail"
                      className="dhara-gal-thumb-media aspect-square w-full cursor-pointer"
                      onClick={() => setLightboxIndex(index)}
                    />
                    <div className="dhara-gal-thumb-bar">
                      <p>{photo.originalName}</p>
                      <div className="dhara-gal-thumb-actions">
                        <button
                          type="button"
                          className="dhara-gal-icon-btn"
                          onClick={() => setLightboxIndex(index)}
                          aria-label="View photo"
                        >
                          <ZoomIn strokeWidth={2.4} absoluteStrokeWidth />
                        </button>
                        {canUpdate && (
                          <button
                            type="button"
                            className="dhara-gal-icon-btn is-danger"
                            onClick={() => deleteMutation.mutate(photo.id)}
                            aria-label="Delete photo"
                          >
                            <Trash2 strokeWidth={2.4} absoluteStrokeWidth />
                          </button>
                        )}
                      </div>
                    </div>
                    {photo.clientSelected && <span className="dhara-gal-selected">Selected</span>}
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    className="dhara-gal-btn is-cyan"
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

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Trash2, Upload, X, ZoomIn } from 'lucide-react';
import { Gallery, galleriesService } from '@/services/galleries-service';
import { GalleryPhotoImage } from '@/components/gallery/GalleryPhotoImage';
import { GalleryLightbox } from '@/components/gallery/GalleryLightbox';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

interface GalleryDetailModalProps {
  open: boolean;
  gallery: Gallery | null;
  canUpdate?: boolean;
  onClose: () => void;
}

export function GalleryDetailModal({ open, gallery, canUpdate, onClose }: GalleryDetailModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) =>
      galleriesService.uploadPhotos(gallery!.id, files, setUploadProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      if (gallery) {
        queryClient.invalidateQueries({ queryKey: ['galleries', gallery.id] });
      }
      setUploadProgress(null);
      setFeedback({ type: 'success', message: 'Photos uploaded successfully.' });
    },
    onError: (error: unknown) => {
      setUploadProgress(null);
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Upload failed.') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => galleriesService.deletePhoto(gallery!.id, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      if (gallery) {
        queryClient.invalidateQueries({ queryKey: ['galleries', gallery.id] });
      }
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

  const photos = gallery.photos ?? [];

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    uploadMutation.mutate(Array.from(fileList));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-card">
        <div className="flex items-start justify-between gap-4 border-b border-surface-border px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">{gallery.bookingNumber}</p>
            <h2 className="font-display text-xl font-semibold text-gold">{gallery.name}</h2>
            <p className="text-sm text-gray-400">
              {gallery.clientName} · {gallery.eventType} · {gallery.photoCount} photos
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
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <button
                  type="button"
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={uploadMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1.5 inline h-3.5 w-3.5" />
                  Upload Photos
                </button>
              </>
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

          {uploadProgress !== null && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs text-gray-400">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
                <div className="h-full bg-gold transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {photos.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-surface-border text-center">
              <ImagePlus className="h-12 w-12 text-gray-600" />
              <p className="mt-3 text-sm text-gray-400">No photos yet. Upload images to start this gallery.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {photos.map((photo, index) => (
                <div key={photo.id} className="group relative overflow-hidden rounded-lg border border-surface-border bg-surface-elevated">
                  <GalleryPhotoImage
                    galleryId={gallery.id}
                    photoId={photo.id}
                    alt={photo.originalName}
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
          )}
        </div>
      </div>

      {lightboxIndex !== null && lightboxIndex >= 0 && (
        <GalleryLightbox
          open
          galleryId={gallery.id}
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

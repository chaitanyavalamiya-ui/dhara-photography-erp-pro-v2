import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { GalleryPhoto } from '@/services/galleries-service';
import { GalleryPhotoImage } from '@/components/gallery/GalleryPhotoImage';
import { cn } from '@/utils/cn';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const SWIPE_THRESHOLD_PX = 50;

interface GalleryLightboxProps {
  open: boolean;
  galleryId: string;
  photos: GalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
}

export function GalleryLightbox({
  open,
  galleryId,
  photos,
  initialIndex,
  onClose,
}: GalleryLightboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const photoCount = photos.length;
  const currentPhoto = photos[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < photoCount - 1;

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
    }
  }, [open, initialIndex]);

  useEffect(() => {
    setZoom(1);
  }, [currentIndex]);

  const goPrev = useCallback(() => {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((index) => Math.min(photoCount - 1, index + 1));
  }, [photoCount]);

  const zoomIn = useCallback(() => {
    setZoom((value) => Math.min(MAX_ZOOM, Number((value + ZOOM_STEP).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((value) => Math.max(MIN_ZOOM, Number((value - ZOOM_STEP).toFixed(2))));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const element = containerRef.current;
    if (!element) return;

    try {
      if (!document.fullscreenElement && element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen API may be unavailable or blocked; lightbox still works.
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.fullscreenElement) {
          void document.exitFullscreen?.();
        }
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' && canGoPrev) goPrev();
      if (event.key === 'ArrowRight' && canGoNext) goNext();
    };

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (document.fullscreenElement) {
        void document.exitFullscreen?.();
      }
    };
  }, [open, onClose, goPrev, goNext, canGoPrev, canGoNext]);

  const handleOverlayClick = () => {
    onClose();
  };

  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (touchStartX.current === null) return;

    const touchEndX = event.changedTouches[0]?.clientX;
    if (touchEndX === undefined) return;

    const deltaX = touchEndX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    if (deltaX > 0 && canGoPrev) goPrev();
    if (deltaX < 0 && canGoNext) goNext();
  };

  if (!open || !currentPhoto) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[70] flex flex-col bg-[#12080c]/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Gallery photo viewer"
    >
      <div
        className="absolute inset-0"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-gold/20 bg-[#1a0d12]/80 px-3 py-3 sm:px-5">
        <p className="truncate text-sm font-medium text-gold">
          {currentPhoto.originalName}
        </p>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="rounded-full border border-gold/30 bg-black/40 px-2.5 py-1 text-xs font-medium text-gray-200">
            {currentIndex + 1} / {photoCount}
          </span>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-300 transition hover:bg-gold/10 hover:text-gold"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-300 transition hover:bg-gold/10 hover:text-gold"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-300 transition hover:bg-gold/10 hover:text-gold"
            onClick={resetZoom}
            aria-label="Reset zoom"
            title="Reset zoom"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-300 transition hover:bg-gold/10 hover:text-gold"
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
            title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-300 transition hover:bg-gold/10 hover:text-gold"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="relative z-10 flex flex-1 items-center justify-center overflow-hidden px-14 py-6 sm:px-20"
        onClick={handleOverlayClick}
      >
        <button
          type="button"
          className={cn(
            'absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-gold/30 bg-black/50 p-2 text-gold transition hover:bg-gold/15 sm:left-4 sm:p-3',
            !canGoPrev && 'pointer-events-none opacity-30',
          )}
          onClick={(event) => {
            event.stopPropagation();
            goPrev();
          }}
          disabled={!canGoPrev}
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
        </button>

        <div
          className="flex h-full w-full max-w-6xl items-center justify-center"
          onClick={(event) => event.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex max-h-full max-w-full items-center justify-center transition-transform duration-200 ease-out"
            style={{ transform: `scale(${zoom})` }}
          >
            <GalleryPhotoImage
              key={currentPhoto.id}
              galleryId={galleryId}
              photoId={currentPhoto.id}
              alt={currentPhoto.originalName}
              variant="original"
              objectFit="contain"
              errorMessage="Unable to load photo"
              className="max-h-[calc(100vh-9rem)] max-w-full select-none"
            />
          </div>
        </div>

        <button
          type="button"
          className={cn(
            'absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-gold/30 bg-black/50 p-2 text-gold transition hover:bg-gold/15 sm:right-4 sm:p-3',
            !canGoNext && 'pointer-events-none opacity-30',
          )}
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
          disabled={!canGoNext}
          aria-label="Next photo"
        >
          <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
        </button>
      </div>
    </div>
  );
}

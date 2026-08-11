import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent,
} from 'react';
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

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.25;
const WHEEL_ZOOM_STEP = 0.12;
const SWIPE_THRESHOLD_PX = 50;

interface PanOffset {
  x: number;
  y: number;
}

interface GalleryLightboxProps {
  open: boolean;
  galleryId: string;
  photos: GalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function computePanForZoom(
  currentZoom: number,
  nextZoom: number,
  pointerX: number,
  pointerY: number,
  viewportWidth: number,
  viewportHeight: number,
  currentPan: PanOffset,
): PanOffset {
  if (nextZoom === 1) {
    return { x: 0, y: 0 };
  }

  const ratio = nextZoom / currentZoom;
  const centerX = viewportWidth / 2 + currentPan.x;
  const centerY = viewportHeight / 2 + currentPan.y;

  return {
    x: pointerX - (pointerX - centerX) * ratio - viewportWidth / 2,
    y: pointerY - (pointerY - centerY) * ratio - viewportHeight / 2,
  };
}

export function GalleryLightbox({
  open,
  galleryId,
  photos,
  initialIndex,
  onClose,
}: GalleryLightboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const dragState = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const photoCount = photos.length;
  const currentPhoto = photos[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < photoCount - 1;

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      resetView();
    }
  }, [open, initialIndex, resetView]);

  useEffect(() => {
    resetView();
  }, [currentIndex, resetView]);

  const adjustZoomTowardPoint = useCallback((delta: number, pointerX: number, pointerY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const { width, height } = viewport.getBoundingClientRect();

    setZoom((currentZoom) => {
      const nextZoom = clampZoom(currentZoom + delta);
      if (nextZoom === currentZoom) return currentZoom;

      setPan((currentPan) =>
        computePanForZoom(currentZoom, nextZoom, pointerX, pointerY, width, height, currentPan),
      );

      return nextZoom;
    });
  }, []);

  const goPrev = useCallback(() => {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((index) => Math.min(photoCount - 1, index + 1));
  }, [photoCount]);

  const zoomIn = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { width, height } = viewport.getBoundingClientRect();
    adjustZoomTowardPoint(ZOOM_STEP, width / 2, height / 2);
  }, [adjustZoomTowardPoint]);

  const zoomOut = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { width, height } = viewport.getBoundingClientRect();
    adjustZoomTowardPoint(-ZOOM_STEP, width / 2, height / 2);
  }, [adjustZoomTowardPoint]);

  const resetZoom = useCallback(() => {
    resetView();
  }, [resetView]);

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

    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = viewport.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const direction = event.deltaY < 0 ? 1 : -1;

      setZoom((currentZoom) => {
        const nextZoom = clampZoom(currentZoom + direction * WHEEL_ZOOM_STEP);
        if (nextZoom === currentZoom) return currentZoom;

        setPan((currentPan) =>
          computePanForZoom(
            currentZoom,
            nextZoom,
            pointerX,
            pointerY,
            rect.width,
            rect.height,
            currentPan,
          ),
        );

        return nextZoom;
      });
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', onWheel);
    };
  }, [open, currentIndex]);

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

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (event: MouseEvent) => {
      if (!dragState.current?.active) return;
      setPan({
        x: dragState.current.panX + (event.clientX - dragState.current.startX),
        y: dragState.current.panY + (event.clientY - dragState.current.startY),
      });
    };

    const endDrag = () => {
      dragState.current = null;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endDrag);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
    };
  }, [isDragging]);

  const handleOverlayClick = () => {
    onClose();
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || zoom <= 1) return;

    event.preventDefault();
    event.stopPropagation();
    dragState.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setIsDragging(true);
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (zoom > 1) return;
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (zoom > 1 || touchStartX.current === null) return;

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
          <span className="hidden text-xs text-gray-400 sm:inline">{Math.round(zoom * 100)}%</span>
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
          ref={viewportRef}
          className={cn(
            'relative h-full w-full max-w-6xl touch-none',
            zoom > 1 && (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
          )}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="absolute left-1/2 top-1/2 flex max-h-full max-w-full items-center justify-center"
            style={{
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
              transition: isDragging ? 'none' : undefined,
            }}
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

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { galleriesService } from '@/services/galleries-service';
import { cn } from '@/utils/cn';

interface GalleryPhotoImageProps {
  galleryId: string;
  photoId: string;
  alt: string;
  className?: string;
  variant?: 'thumbnail' | 'original';
  onClick?: () => void;
}

export function GalleryPhotoImage({
  galleryId,
  photoId,
  alt,
  className,
  variant = 'thumbnail',
  onClick,
}: GalleryPhotoImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      try {
        const token = useAuthStore.getState().accessToken;
        const response = await fetch(galleriesService.getPhotoUrl(galleryId, photoId, variant), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error('Failed to load image');
        }

        const blob = await response.blob();
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [galleryId, photoId, variant]);

  if (error) {
    return (
      <div className={cn('flex items-center justify-center bg-surface-elevated text-xs text-gray-500', className)}>
        Failed
      </div>
    );
  }

  if (!src) {
    return <div className={cn('animate-pulse bg-surface-elevated', className)} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn('object-cover', className)}
      onClick={onClick}
      loading="lazy"
    />
  );
}

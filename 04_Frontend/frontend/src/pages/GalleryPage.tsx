/**
 * LOCKED APPROVED BASELINE:
 * Do not modify this Gallery module without an explicit user request.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Camera, Eye, Images, Plus, Search, Trash2 } from 'lucide-react';
import { ClientSearchSelect } from '@/components/clients/ClientSearchSelect';
import { bookingsService } from '@/services/bookings-service';
import {
  Gallery,
  GALLERY_STATUS_OPTIONS,
  galleriesService,
} from '@/services/galleries-service';
import { useAuthStore } from '@/stores/auth-store';
import { CreateGalleryModal } from '@/components/gallery/CreateGalleryModal';
import { GalleryDetailModal } from '@/components/gallery/GalleryDetailModal';
import { ArchiveGalleryDialog } from '@/components/gallery/ArchiveGalleryDialog';
import {
  galleryEventTone,
  galleryStatusLabel,
  galleryStatusTone,
} from '@/components/gallery/gallery-visual';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';
import './gallery/gallery-page.css';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function GalleryPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'eventDate' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailGalleryId, setDetailGalleryId] = useState<string | null>(null);
  const [archiveGallery, setArchiveGallery] = useState<Gallery | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const canCreate = hasPermission('gallery.create');
  const canUpdate = hasPermission('gallery.update');
  const canArchive = hasPermission('gallery.archive');

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'gallery-filter'],
    queryFn: () => bookingsService.list({ limit: 100, sortBy: 'eventDate', sortOrder: 'desc' }),
  });

  const selectedBookingQuery = useQuery({
    queryKey: ['bookings', bookingFilter],
    queryFn: () => bookingsService.getById(bookingFilter),
    enabled: Boolean(bookingFilter),
  });

  const listQuery = useQuery({
    queryKey: ['galleries', page, search, statusFilter, clientFilter, bookingFilter, sortBy, sortOrder],
    queryFn: () =>
      galleriesService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        clientId: clientFilter || undefined,
        bookingId: bookingFilter || undefined,
        sortBy,
        sortOrder,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['galleries', detailGalleryId],
    queryFn: () => galleriesService.getById(detailGalleryId!),
    enabled: !!detailGalleryId,
  });

  const createMutation = useMutation({
    mutationFn: galleriesService.create,
    onSuccess: (gallery) => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      setCreateOpen(false);
      setDetailGalleryId(gallery.id);
      setFeedback({ type: 'success', message: 'Gallery created successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to create gallery.'),
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => galleriesService.archive(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      setArchiveGallery(null);
      if (detailGalleryId === id) {
        setDetailGalleryId(null);
      }
      setFeedback({ type: 'success', message: 'Gallery archived successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to archive gallery.'),
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const galleries = listQuery.data?.items ?? [];
  const hasFilters = Boolean(
    search || clientFilter || bookingFilter || (statusFilter && statusFilter !== 'all'),
  );
  const bookingOptions = [...(bookingsQuery.data?.items ?? [])];
  if (
    selectedBookingQuery.data &&
    !bookingOptions.some((booking) => booking.id === selectedBookingQuery.data.id)
  ) {
    bookingOptions.unshift(selectedBookingQuery.data);
  }

  const matchingGalleries = listQuery.data?.total;
  const photosInView = galleries.reduce((sum, gallery) => sum + gallery.photoCount, 0);
  const galleriesWithPhotos = galleries.filter((gallery) => gallery.photoCount > 0).length;

  return (
    <div className="dhara-gallery">
      <section className="dhara-gal-hero">
        <div>
          <p className="dhara-gal-kicker">DHARA PHOTOGRAPHY ERP PRO</p>
          <h2>Gallery Management</h2>
          <p className="dhara-gal-hero-copy">
            ક્લાયન્ટની યાદો, ફોટા અને ગેલેરીને સુંદર રીતે સંભાળો અને સાચવો.
          </p>
        </div>
        <div className="dhara-gal-hero-art" aria-hidden>
          <svg viewBox="0 0 120 120" fill="none">
            <rect x="18" y="28" width="84" height="64" rx="12" stroke="#ffd45a" strokeWidth="2.4" />
            <circle cx="60" cy="60" r="18" stroke="#22d3ee" strokeWidth="2.2" />
            <circle cx="60" cy="60" r="8" fill="#ff4ec8" />
            <rect x="78" y="36" width="14" height="10" rx="3" fill="rgba(255,212,90,0.35)" stroke="#ffd45a" />
            <path d="M32 92h56" stroke="#ffe7b8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </section>

      <div className="dhara-gal-kpis">
        <article className="dhara-gal-kpi is-gold">
          <div className="dhara-gal-kpi-top">
            <h3>Matching Galleries</h3>
            <span className="dhara-gal-icon">
              <Images strokeWidth={2.35} absoluteStrokeWidth />
            </span>
          </div>
          <strong>{listQuery.isLoading ? '—' : matchingGalleries ?? 0}</strong>
        </article>
        <article className="dhara-gal-kpi is-cyan">
          <div className="dhara-gal-kpi-top">
            <h3>Photos On This Page</h3>
            <span className="dhara-gal-icon">
              <Camera strokeWidth={2.35} absoluteStrokeWidth />
            </span>
          </div>
          <strong>{listQuery.isLoading ? '—' : photosInView}</strong>
        </article>
        <article className="dhara-gal-kpi is-magenta">
          <div className="dhara-gal-kpi-top">
            <h3>With Photos (Page)</h3>
            <span className="dhara-gal-icon">
              <Eye strokeWidth={2.35} absoluteStrokeWidth />
            </span>
          </div>
          <strong>{listQuery.isLoading ? '—' : galleriesWithPhotos}</strong>
        </article>
      </div>

      {feedback && (
        <div className={cn('dhara-gal-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
          {feedback.message}
        </div>
      )}

      <form className="dhara-gal-panel dhara-gal-toolbar" onSubmit={handleSearch}>
        <div className="dhara-gal-toolbar-row">
          <div className="dhara-gal-field is-search">
            <label htmlFor="gallery-search">Search</label>
            <div className="dhara-gal-input-wrap">
              <Search aria-hidden />
              <input
                id="gallery-search"
                className="dhara-gal-input is-icon"
                placeholder="Gallery name, client, booking..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <div className="dhara-gal-field">
            <label>Client</label>
            <ClientSearchSelect
              value={clientFilter}
              onChange={(clientId) => {
                setClientFilter(clientId);
                setPage(1);
              }}
              emptyLabel="All clients"
            />
          </div>
          <div className="dhara-gal-field">
            <label htmlFor="gallery-booking">Booking</label>
            <select
              id="gallery-booking"
              className="input-field"
              value={bookingFilter}
              onChange={(e) => {
                setBookingFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All bookings</option>
              {bookingOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bookingNumber} — {b.client.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="dhara-gal-field">
            <label htmlFor="gallery-status">Status</label>
            <select
              id="gallery-status"
              className="input-field"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              {GALLERY_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="dhara-gal-field">
            <label htmlFor="gallery-sort">Sort</label>
            <select
              id="gallery-sort"
              className="input-field"
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [nextSort, nextOrder] = e.target.value.split(':') as [
                  'createdAt' | 'eventDate' | 'name',
                  'asc' | 'desc',
                ];
                setSortBy(nextSort);
                setSortOrder(nextOrder);
                setPage(1);
              }}
            >
              <option value="createdAt:desc">Newest created</option>
              <option value="createdAt:asc">Oldest created</option>
              <option value="eventDate:desc">Event date (newest)</option>
              <option value="eventDate:asc">Event date (oldest)</option>
              <option value="name:asc">Name A–Z</option>
              <option value="name:desc">Name Z–A</option>
            </select>
          </div>
          <button type="submit" className="dhara-gal-btn is-cyan">
            Search
          </button>
          {canCreate && (
            <button type="button" className="dhara-gal-btn is-gold" onClick={() => setCreateOpen(true)}>
              <Plus strokeWidth={2.5} absoluteStrokeWidth />
              Create Gallery
            </button>
          )}
        </div>
      </form>

      {listQuery.isLoading ? (
        <div className="dhara-gal-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dhara-gal-card dhara-gal-skeleton" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <div className="dhara-gal-error">
          <AlertCircle strokeWidth={2.4} absoluteStrokeWidth />
          <p>{getApiErrorMessage(listQuery.error, 'Failed to load galleries.')}</p>
          <button type="button" className="dhara-gal-btn is-cyan" onClick={() => void listQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : galleries.length === 0 ? (
        <div className="dhara-gal-empty">
          <Images strokeWidth={2.4} absoluteStrokeWidth />
          <p>
            {hasFilters ? 'No galleries match your filters.' : 'No galleries yet.'}
          </p>
          {canCreate && !hasFilters && (
            <button type="button" className="dhara-gal-btn is-gold" onClick={() => setCreateOpen(true)}>
              Create your first gallery
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="dhara-gal-grid">
            {galleries.map((gallery: Gallery) => (
              <article
                key={gallery.id}
                className={cn('dhara-gal-card', galleryEventTone(gallery.eventType))}
              >
                <div className="dhara-gal-cover" aria-hidden>
                  <Camera strokeWidth={2.2} absoluteStrokeWidth />
                  <span className="dhara-gal-cover-meta">
                    {gallery.photoCount} photo{gallery.photoCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="dhara-gal-card-body">
                  <div className="dhara-gal-card-top">
                    <div className="min-w-0">
                      <p>{gallery.bookingNumber}</p>
                      <h3 className="truncate">{gallery.name}</h3>
                    </div>
                    <span className={cn('dhara-gal-status', galleryStatusTone(gallery.status))}>
                      {galleryStatusLabel(gallery.status)}
                    </span>
                  </div>
                  <p className="dhara-gal-card-client truncate">{gallery.clientName}</p>
                  <p className="dhara-gal-card-meta">
                    {gallery.eventType || 'Event'} · {formatDate(gallery.eventDate)}
                  </p>
                  <div className="dhara-gal-card-actions">
                    <button
                      type="button"
                      className="dhara-gal-btn is-cyan"
                      style={{ flex: 1 }}
                      onClick={() => setDetailGalleryId(gallery.id)}
                    >
                      <Eye strokeWidth={2.4} absoluteStrokeWidth />
                      Open Gallery
                    </button>
                    {canArchive && (
                      <button
                        type="button"
                        className="dhara-gal-btn is-danger"
                        onClick={() => setArchiveGallery(gallery)}
                        aria-label="Archive gallery"
                      >
                        <Trash2 strokeWidth={2.4} absoluteStrokeWidth />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {(listQuery.data?.totalPages ?? 1) > 1 && (
            <div className="dhara-gal-pager">
              <button
                type="button"
                className="dhara-gal-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {listQuery.data?.totalPages}
              </span>
              <button
                type="button"
                className="dhara-gal-btn"
                disabled={page >= (listQuery.data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <CreateGalleryModal
        open={createOpen}
        isSubmitting={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => createMutation.mutate(values)}
      />

      <GalleryDetailModal
        open={!!detailGalleryId}
        gallery={detailQuery.data ?? null}
        canUpdate={canUpdate}
        canArchive={canArchive}
        onClose={() => setDetailGalleryId(null)}
        onArchive={() => {
          if (detailQuery.data) {
            setArchiveGallery(detailQuery.data);
          }
        }}
      />

      <ArchiveGalleryDialog
        open={!!archiveGallery}
        gallery={archiveGallery}
        isArchiving={archiveMutation.isPending}
        onClose={() => setArchiveGallery(null)}
        onConfirm={() => {
          if (archiveGallery) {
            archiveMutation.mutate(archiveGallery.id);
          }
        }}
      />
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BookImage,
  CheckCircle2,
  Clock3,
  Eye,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import { ClientSearchSelect } from '@/components/clients/ClientSearchSelect';
import { bookingsService } from '@/services/bookings-service';
import {
  Album,
  ALBUM_STATUS_OPTIONS,
  ALBUM_TYPE_OPTIONS,
  albumsService,
  UpdateAlbumPayload,
} from '@/services/albums-service';
import { useAuthStore } from '@/stores/auth-store';
import { CreateAlbumModal } from '@/components/albums/CreateAlbumModal';
import { EditAlbumModal } from '@/components/albums/EditAlbumModal';
import { AlbumDetailModal } from '@/components/albums/AlbumDetailModal';
import { ArchiveAlbumDialog } from '@/components/albums/ArchiveAlbumDialog';
import {
  albumInitials,
  albumStatusLabel,
  albumStatusTone,
  albumTypeLabel,
  albumTypeTone,
} from '@/components/albums/album-visual';
import { formatCurrency } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';
import { invalidateAfterAccountsExpense } from '@/utils/invalidate-financial-queries';
import './albums/albums-page.css';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AlbumsPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailAlbumId, setDetailAlbumId] = useState<string | null>(null);
  const [editAlbum, setEditAlbum] = useState<Album | null>(null);
  const [archiveAlbum, setArchiveAlbum] = useState<Album | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const canCreate = hasPermission('album.create');
  const canUpdate = hasPermission('album.update');
  const canArchive = hasPermission('album.archive');

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'album-filter'],
    queryFn: () => bookingsService.list({ limit: 100, sortBy: 'eventDate', sortOrder: 'desc' }),
  });

  const selectedBookingQuery = useQuery({
    queryKey: ['bookings', bookingFilter],
    queryFn: () => bookingsService.getById(bookingFilter),
    enabled: Boolean(bookingFilter),
  });

  const listQuery = useQuery({
    queryKey: ['albums', page, search, statusFilter, typeFilter, clientFilter, bookingFilter],
    queryFn: () =>
      albumsService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        albumType: typeFilter,
        clientId: clientFilter || undefined,
        bookingId: bookingFilter || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['albums', detailAlbumId],
    queryFn: () => albumsService.getById(detailAlbumId!),
    enabled: !!detailAlbumId,
  });

  const createMutation = useMutation({
    mutationFn: albumsService.create,
    onSuccess: (album) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      invalidateAfterAccountsExpense(queryClient);
      setCreateOpen(false);
      setDetailAlbumId(album.id);
      setFeedback({ type: 'success', message: 'Album created successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Failed to create album.') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAlbumPayload }) =>
      albumsService.update(id, data),
    onSuccess: (album) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      invalidateAfterAccountsExpense(queryClient);
      setEditAlbum(null);
      setDetailAlbumId(album.id);
      setFeedback({ type: 'success', message: 'Album updated successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Failed to update album.') });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => albumsService.archive(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      invalidateAfterAccountsExpense(queryClient);
      setArchiveAlbum(null);
      if (detailAlbumId === id) {
        setDetailAlbumId(null);
      }
      setFeedback({ type: 'success', message: 'Album archived successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Failed to archive album.') });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const albums = listQuery.data?.items ?? [];
  const hasFilters = Boolean(
    search ||
      clientFilter ||
      bookingFilter ||
      (statusFilter && statusFilter !== 'all') ||
      (typeFilter && typeFilter !== 'all'),
  );
  const bookingOptions = [...(bookingsQuery.data?.items ?? [])];
  if (
    selectedBookingQuery.data &&
    !bookingOptions.some((booking) => booking.id === selectedBookingQuery.data.id)
  ) {
    bookingOptions.unshift(selectedBookingQuery.data);
  }

  const matchingAlbums = listQuery.data?.total;
  const pendingOnPage = albums.filter((album) => album.status === 'pending').length;
  const productionOnPage = albums.filter(
    (album) => album.status === 'designing' || album.status === 'printing',
  ).length;
  const readyOnPage = albums.filter((album) => album.status === 'ready').length;
  const deliveredOnPage = albums.filter((album) => album.status === 'delivered').length;

  return (
    <div className="dhara-albums">
      <section className="dhara-alb-hero">
        <div>
          <p className="dhara-alb-kicker">DHARA PHOTOGRAPHY ERP PRO</p>
          <h2>Albums Management</h2>
          <p className="dhara-alb-hero-copy">
            Manage album orders, photo selection, and printing workflow.
          </p>
          {canCreate && (
            <div className="dhara-alb-hero-actions">
              <button type="button" className="dhara-alb-btn is-gold" onClick={() => setCreateOpen(true)}>
                <Plus strokeWidth={2.4} absoluteStrokeWidth />
                Add New Album
              </button>
            </div>
          )}
        </div>
        <div className="dhara-alb-hero-art" aria-hidden>
          <svg viewBox="0 0 120 120" fill="none">
            <rect x="28" y="22" width="64" height="80" rx="6" fill="rgba(255,212,90,0.08)" stroke="#ffd45a" strokeWidth="2.3" />
            <rect x="22" y="28" width="64" height="80" rx="6" fill="rgba(159,18,57,0.28)" stroke="#c084fc" strokeWidth="2" />
            <rect x="34" y="18" width="64" height="80" rx="6" fill="rgba(10,4,8,0.55)" stroke="#ffe08a" strokeWidth="2.4" />
            <path d="M46 38h40" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M46 50h28" stroke="#fff1c9" strokeWidth="2" strokeLinecap="round" />
            <path d="M46 62h34" stroke="#fff1c9" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </section>

      <div className="dhara-alb-kpis">
        <article className="dhara-alb-kpi is-gold">
          <div className="dhara-alb-kpi-top">
            <h3>Matching Albums</h3>
            <span className="dhara-alb-icon">
              <BookImage strokeWidth={2.35} absoluteStrokeWidth />
            </span>
          </div>
          <strong>{listQuery.isLoading ? '—' : matchingAlbums ?? 0}</strong>
        </article>
        <article className="dhara-alb-kpi is-amber">
          <div className="dhara-alb-kpi-top">
            <div>
              <h3>Pending</h3>
              <p>On this page</p>
            </div>
            <span className="dhara-alb-icon">
              <Clock3 strokeWidth={2.35} absoluteStrokeWidth />
            </span>
          </div>
          <strong>{listQuery.isLoading ? '—' : pendingOnPage}</strong>
        </article>
        <article className="dhara-alb-kpi is-cyan">
          <div className="dhara-alb-kpi-top">
            <div>
              <h3>In Production</h3>
              <p>Designing + Printing</p>
            </div>
            <span className="dhara-alb-icon">
              <Printer strokeWidth={2.35} absoluteStrokeWidth />
            </span>
          </div>
          <strong>{listQuery.isLoading ? '—' : productionOnPage}</strong>
        </article>
        <article className="dhara-alb-kpi is-green">
          <div className="dhara-alb-kpi-top">
            <div>
              <h3>Ready</h3>
              <p>On this page</p>
            </div>
            <span className="dhara-alb-icon">
              <CheckCircle2 strokeWidth={2.35} absoluteStrokeWidth />
            </span>
          </div>
          <strong>{listQuery.isLoading ? '—' : readyOnPage}</strong>
        </article>
        <article className="dhara-alb-kpi is-purple">
          <div className="dhara-alb-kpi-top">
            <div>
              <h3>Delivered</h3>
              <p>On this page</p>
            </div>
            <span className="dhara-alb-icon">
              <BookImage strokeWidth={2.35} absoluteStrokeWidth />
            </span>
          </div>
          <strong>{listQuery.isLoading ? '—' : deliveredOnPage}</strong>
        </article>
      </div>

      {feedback && (
        <div className={cn('dhara-alb-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
          {feedback.message}
        </div>
      )}

      <form className="dhara-alb-panel dhara-alb-toolbar" onSubmit={handleSearch}>
        <div className="dhara-alb-toolbar-row">
          <div className="dhara-alb-field is-search">
            <label htmlFor="album-search">Search</label>
            <div className="dhara-alb-input-wrap">
              <Search aria-hidden />
              <input
                id="album-search"
                className="dhara-alb-input is-icon"
                placeholder="Album name, client, booking, vendor..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <div className="dhara-alb-field">
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
          <div className="dhara-alb-field">
            <label htmlFor="album-booking">Booking</label>
            <select
              id="album-booking"
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
          <div className="dhara-alb-field">
            <label htmlFor="album-status">Status</label>
            <select
              id="album-status"
              className="input-field"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              {ALBUM_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="dhara-alb-field">
            <label htmlFor="album-type">Album Type</label>
            <select
              id="album-type"
              className="input-field"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All types</option>
              {ALBUM_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="dhara-alb-btn is-cyan">
            Search
          </button>
        </div>
      </form>

      {listQuery.isLoading ? (
        <div className="dhara-alb-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dhara-alb-skeleton" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <div className="dhara-alb-error">
          <AlertCircle strokeWidth={2.35} absoluteStrokeWidth />
          <p>{getApiErrorMessage(listQuery.error, 'Failed to load albums.')}</p>
          <button type="button" className="dhara-alb-btn" onClick={() => void listQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : albums.length === 0 ? (
        <div className="dhara-alb-empty">
          <BookImage strokeWidth={2.35} absoluteStrokeWidth />
          <p>{hasFilters ? 'No albums match your filters.' : 'No albums yet.'}</p>
          {canCreate && !hasFilters && (
            <button type="button" className="dhara-alb-btn is-gold" onClick={() => setCreateOpen(true)}>
              <Plus strokeWidth={2.4} absoluteStrokeWidth />
              Create your first album
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="dhara-alb-grid">
            {albums.map((album: Album) => (
              <article key={album.id} className="dhara-alb-card">
                <div className={cn('dhara-alb-cover', albumTypeTone(album.albumType))}>
                  <span className="dhara-alb-mark">{albumInitials(album.name)}</span>
                  <div className="dhara-alb-cover-copy">
                    <p>{album.bookingNumber}</p>
                    <h3>{album.name}</h3>
                  </div>
                </div>
                <div className="dhara-alb-card-body">
                  <p className="dhara-alb-card-client">{album.clientName}</p>
                  <p className="dhara-alb-card-meta">
                    {album.pageCount} pages · {album.selectedPhotoCount} photos
                  </p>
                  <p className="dhara-alb-card-meta">
                    {formatCurrency(album.albumPrice)} · Profit {formatCurrency(album.profit)}
                  </p>
                  <p className="dhara-alb-card-meta">Expected {formatDate(album.expectedDeliveryDate)}</p>
                  <div className="dhara-alb-badges">
                    <span className={cn('dhara-alb-chip', albumTypeTone(album.albumType))}>
                      {albumTypeLabel(album.albumType)}
                    </span>
                    <span className={cn('dhara-alb-status', albumStatusTone(album.status))}>
                      {albumStatusLabel(album.status)}
                    </span>
                  </div>
                  <div className="dhara-alb-card-actions">
                    <button
                      type="button"
                      className="dhara-alb-btn is-cyan"
                      onClick={() => setDetailAlbumId(album.id)}
                    >
                      <Eye strokeWidth={2.4} absoluteStrokeWidth />
                      Open
                    </button>
                    {canUpdate && (
                      <button
                        type="button"
                        className="dhara-alb-btn"
                        onClick={() => setEditAlbum(album)}
                        aria-label="Edit album"
                      >
                        <Pencil strokeWidth={2.4} absoluteStrokeWidth />
                      </button>
                    )}
                    {canArchive && (
                      <button
                        type="button"
                        className="dhara-alb-btn is-danger"
                        onClick={() => setArchiveAlbum(album)}
                        aria-label="Archive album"
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
            <div className="dhara-alb-pager">
              <button
                type="button"
                className="dhara-alb-btn"
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
                className="dhara-alb-btn"
                disabled={page >= (listQuery.data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <CreateAlbumModal
        open={createOpen}
        isSubmitting={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => createMutation.mutate(values)}
      />

      <AlbumDetailModal
        open={!!detailAlbumId}
        album={detailQuery.data ?? null}
        canUpdate={canUpdate}
        onClose={() => setDetailAlbumId(null)}
        onEdit={() => {
          if (detailQuery.data) {
            setEditAlbum(detailQuery.data);
          }
        }}
      />

      <EditAlbumModal
        open={!!editAlbum}
        album={editAlbum}
        isSubmitting={updateMutation.isPending}
        onClose={() => setEditAlbum(null)}
        onSubmit={(values) => {
          if (editAlbum) {
            updateMutation.mutate({ id: editAlbum.id, data: values });
          }
        }}
      />

      <ArchiveAlbumDialog
        open={!!archiveAlbum}
        album={archiveAlbum}
        isArchiving={archiveMutation.isPending}
        onClose={() => setArchiveAlbum(null)}
        onConfirm={() => {
          if (archiveAlbum) {
            archiveMutation.mutate(archiveAlbum.id);
          }
        }}
      />
    </div>
  );
}

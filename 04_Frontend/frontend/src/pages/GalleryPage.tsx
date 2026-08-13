import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Image, Plus, Search, Trash2 } from 'lucide-react';
import { clientsService } from '@/services/clients-service';
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
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

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
    case 'active':
      return 'bg-green-500/15 text-green-400 border-green-500/30';
    case 'client_review':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'approved':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'delivered':
      return 'bg-gold/15 text-gold border-gold/30';
    default:
      return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  }
}

export function GalleryPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
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

  const clientsQuery = useQuery({
    queryKey: ['clients', 'gallery-filter'],
    queryFn: () =>
      clientsService.list({ limit: 100, status: 'active', sortBy: 'fullName', sortOrder: 'asc' }),
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'gallery-filter'],
    queryFn: () => bookingsService.list({ limit: 100, sortBy: 'eventDate', sortOrder: 'desc' }),
  });

  const selectedClientQuery = useQuery({
    queryKey: ['clients', clientFilter],
    queryFn: () => clientsService.getById(clientFilter),
    enabled: Boolean(clientFilter),
  });

  const selectedBookingQuery = useQuery({
    queryKey: ['bookings', bookingFilter],
    queryFn: () => bookingsService.getById(bookingFilter),
    enabled: Boolean(bookingFilter),
  });

  const listQuery = useQuery({
    queryKey: ['galleries', page, search, statusFilter, clientFilter, bookingFilter],
    queryFn: () =>
      galleriesService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        clientId: clientFilter || undefined,
        bookingId: bookingFilter || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
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
  const clientOptions = [...(clientsQuery.data?.items ?? [])];
  if (selectedClientQuery.data && !clientOptions.some((client) => client.id === selectedClientQuery.data.id)) {
    clientOptions.unshift(selectedClientQuery.data);
  }
  const bookingOptions = [...(bookingsQuery.data?.items ?? [])];
  if (
    selectedBookingQuery.data &&
    !bookingOptions.some((booking) => booking.id === selectedBookingQuery.data.id)
  ) {
    bookingOptions.unshift(selectedBookingQuery.data);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gold">Gallery</h1>
          <p className="text-sm text-gray-400">Manage client photo galleries linked to bookings</p>
        </div>
        {canCreate && (
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 inline h-4 w-4" />
            Create Gallery
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            feedback.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400',
          )}
        >
          {feedback.message}
        </div>
      )}

      <div className="card space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs text-gray-500">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                className="input-field pl-10"
                placeholder="Gallery name, client, booking..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Client</label>
              <select
                className="input-field"
                value={clientFilter}
                onChange={(e) => {
                  setClientFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All clients</option>
                {(clientOptions).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Booking</label>
              <select
                className="input-field"
                value={bookingFilter}
                onChange={(e) => {
                  setBookingFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All bookings</option>
                {(bookingOptions).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bookingNumber} — {b.client.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Status</label>
              <select
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
          </div>

          <button type="submit" className="btn-secondary whitespace-nowrap">
            Search
          </button>
        </form>
      </div>

      {listQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-40 animate-pulse bg-surface-elevated" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <div className="card border-red-500/30 text-red-400">
          {getApiErrorMessage(listQuery.error, 'Failed to load galleries.')}
        </div>
      ) : galleries.length === 0 ? (
        <div className="card flex min-h-64 flex-col items-center justify-center text-center">
          <Image className="h-12 w-12 text-gray-600" />
          <p className="mt-3 text-gray-400">
            {hasFilters ? 'No galleries match your filters.' : 'No galleries yet.'}
          </p>
          {canCreate && !hasFilters && (
            <button type="button" className="btn-primary mt-4" onClick={() => setCreateOpen(true)}>
              Create your first gallery
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {galleries.map((gallery: Gallery) => (
              <div key={gallery.id} className="card group transition hover:border-gold/40">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">{gallery.bookingNumber}</p>
                    <h3 className="truncate font-medium text-gray-100">{gallery.name}</h3>
                    <p className="truncate text-sm text-gray-400">{gallery.clientName}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase',
                      statusBadgeClass(gallery.status),
                    )}
                  >
                    {gallery.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mb-4 space-y-1 text-sm text-gray-400">
                  <p>Event: {gallery.eventType || '—'}</p>
                  <p>Date: {formatDate(gallery.eventDate)}</p>
                  <p>{gallery.photoCount} photo{gallery.photoCount === 1 ? '' : 's'}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary w-full text-xs"
                    onClick={() => setDetailGalleryId(gallery.id)}
                  >
                    <Eye className="mr-1.5 inline h-3.5 w-3.5" />
                    Open Gallery
                  </button>
                  {canArchive && (
                    <button
                      type="button"
                      className="btn-secondary px-3 text-xs text-red-400 hover:text-red-300"
                      onClick={() => setArchiveGallery(gallery)}
                      aria-label="Archive gallery"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(listQuery.data?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                className="btn-secondary px-3 py-1 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {page} of {listQuery.data?.totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary px-3 py-1 text-xs"
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

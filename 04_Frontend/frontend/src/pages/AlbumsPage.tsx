import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookImage, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { clientsService } from '@/services/clients-service';
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
import { formatCurrency } from '@/utils/booking-form';
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

  const clientsQuery = useQuery({
    queryKey: ['clients', 'album-filter'],
    queryFn: () =>
      clientsService.list({ limit: 100, status: 'active', sortBy: 'fullName', sortOrder: 'asc' }),
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'album-filter'],
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
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
          <h1 className="font-display text-2xl font-semibold text-gold">Albums</h1>
          <p className="text-sm text-gray-400">Manage album orders, photo selection, and printing workflow</p>
        </div>
        {canCreate && (
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 inline h-4 w-4" />
            Create Album
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
        <form onSubmit={handleSearch} className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs text-gray-500">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                className="input-field pl-10"
                placeholder="Album name, client, booking, vendor..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Client</label>
              <select
                className="input-field"
                value={clientFilter}
                onChange={(e) => { setClientFilter(e.target.value); setPage(1); }}
              >
                <option value="">All clients</option>
                {(clientOptions).map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Booking</label>
              <select
                className="input-field"
                value={bookingFilter}
                onChange={(e) => { setBookingFilter(e.target.value); setPage(1); }}
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
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All statuses</option>
                {ALBUM_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Album Type</label>
              <select
                className="input-field"
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All types</option>
                {ALBUM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn-secondary whitespace-nowrap">Search</button>
        </form>
      </div>

      {listQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-48 animate-pulse bg-surface-elevated" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <div className="card border-red-500/30 text-red-400">
          {getApiErrorMessage(listQuery.error, 'Failed to load albums.')}
        </div>
      ) : albums.length === 0 ? (
        <div className="card flex min-h-64 flex-col items-center justify-center text-center">
          <BookImage className="h-12 w-12 text-gray-600" />
          <p className="mt-3 text-gray-400">
            {hasFilters ? 'No albums match your filters.' : 'No albums yet.'}
          </p>
          {canCreate && !hasFilters && (
            <button type="button" className="btn-primary mt-4" onClick={() => setCreateOpen(true)}>
              Create your first album
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album: Album) => (
              <div key={album.id} className="card transition hover:border-gold/40">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">{album.bookingNumber}</p>
                    <h3 className="truncate font-medium text-gray-100">{album.name}</h3>
                    <p className="truncate text-sm text-gray-400">{album.clientName}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize',
                      statusBadgeClass(album.status),
                    )}
                  >
                    {album.status}
                  </span>
                </div>

                <div className="mb-4 space-y-1 text-sm text-gray-400">
                  <p>Type: <span className="capitalize text-gray-300">{album.albumType}</span></p>
                  <p>Pages: {album.pageCount} · Photos: {album.selectedPhotoCount}</p>
                  <p>Price: {formatCurrency(album.albumPrice)} · Profit: <span className="text-gold">{formatCurrency(album.profit)}</span></p>
                  <p>Expected: {formatDate(album.expectedDeliveryDate)}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary flex-1 text-xs"
                    onClick={() => setDetailAlbumId(album.id)}
                  >
                    <Eye className="mr-1.5 inline h-3.5 w-3.5" />
                    Open
                  </button>
                  {canUpdate && (
                    <button
                      type="button"
                      className="btn-secondary px-3 text-xs"
                      onClick={() => setEditAlbum(album)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canArchive && (
                    <button
                      type="button"
                      className="btn-secondary px-3 text-xs text-red-400 hover:text-red-300"
                      onClick={() => setArchiveAlbum(album)}
                      aria-label="Archive album"
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

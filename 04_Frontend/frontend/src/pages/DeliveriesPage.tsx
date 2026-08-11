import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  DELIVERABLE_TYPE_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  DeliveryItem,
  deliveriesService,
} from '@/services/deliveries-service';
import { useAuthStore } from '@/stores/auth-store';
import { DeliveryFormModal } from '@/components/deliveries/DeliveryFormModal';
import { DeliveryViewModal } from '@/components/deliveries/DeliveryViewModal';
import { ArchiveDeliveryDialog } from '@/components/deliveries/ArchiveDeliveryDialog';
import { formatDate } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

function statusBadgeClass(status: string) {
  switch (status) {
    case 'ready':
      return 'bg-green-500/15 text-green-400 border-green-500/30';
    case 'delivered':
      return 'bg-gold/15 text-gold border-gold/30';
    default:
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  }
}

export function DeliveriesPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<DeliveryItem | null>(null);
  const [viewItem, setViewItem] = useState<DeliveryItem | null>(null);
  const [archiveItem, setArchiveItem] = useState<DeliveryItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const canCreate = hasPermission('delivery.create');
  const canUpdate = hasPermission('delivery.update');

  const listQuery = useQuery({
    queryKey: ['deliveries', page, search, statusFilter, typeFilter],
    queryFn: () =>
      deliveriesService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        deliverableType: typeFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const createMutation = useMutation({
    mutationFn: deliveriesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setFormOpen(false);
      setFeedback({ type: 'success', message: 'Delivery item added.' });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Failed to add delivery item.') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof deliveriesService.update>[1] }) =>
      deliveriesService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setFormOpen(false);
      setSelected(null);
      setViewItem(null);
      setFeedback({ type: 'success', message: 'Delivery item updated.' });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Failed to update delivery item.') });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: deliveriesService.archive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setArchiveItem(null);
      setViewItem(null);
      setFeedback({ type: 'success', message: 'Delivery item archived.' });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Failed to archive delivery item.') });
    },
  });

  const totalPages = listQuery.data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-100">Delivery Tracking</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track albums, videos, pendrives, and other client deliverables.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            className="btn-primary inline-flex items-center"
            onClick={() => {
              setFormMode('create');
              setSelected(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Delivery
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

      <div className="card">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              className="input-field w-full pl-10"
              placeholder="Search client, booking, title, notes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearch(searchInput.trim());
                  setPage(1);
                }
              }}
            />
          </div>
          <select
            className="input-field lg:w-40"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            {DELIVERY_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="input-field lg:w-48"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All types</option>
            {DELIVERABLE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSearch(searchInput.trim());
              setPage(1);
            }}
          >
            Search
          </button>
        </div>

        {listQuery.isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading deliveries...</div>
        ) : listQuery.isError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
            Failed to load deliveries.
          </div>
        ) : (listQuery.data?.items.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="mb-3 h-10 w-10 text-gray-600" />
            <p className="text-sm text-gray-500">No delivery items found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-3 font-medium">Deliverable</th>
                  <th className="px-3 py-3 font-medium">Client / Booking</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Expected</th>
                  <th className="px-3 py-3 font-medium">Delivered</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.data?.items.map((item) => (
                  <tr key={item.id} className="border-b border-surface-border/70 hover:bg-white/[0.02]">
                    <td className="px-3 py-4">
                      <p className="font-medium text-gray-100">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.deliverableTypeLabel}</p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-gray-200">{item.clientName}</p>
                      <p className="text-xs text-gray-500">{item.bookingNumber}</p>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs font-medium',
                          statusBadgeClass(item.status),
                        )}
                      >
                        {item.statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-gray-300">{formatDate(item.expectedDate)}</td>
                    <td className="px-3 py-4 text-gray-300">{formatDate(item.deliveredDate)}</td>
                    <td className="px-3 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2.5 py-1.5 text-xs text-gray-300 hover:border-gold/40 hover:text-gold"
                          onClick={() => setViewItem(item)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        {canUpdate && (
                          <>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2.5 py-1.5 text-xs text-gray-300 hover:border-gold/40 hover:text-gold"
                              onClick={() => {
                                setFormMode('edit');
                                setSelected(item);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                              onClick={() => setArchiveItem(item)}
                              aria-label="Archive delivery"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
            <p>
              Page {page} of {totalPages} · {listQuery.data?.total ?? 0} deliveries
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <DeliveryFormModal
        open={formOpen}
        mode={formMode}
        delivery={selected}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setFormOpen(false);
          setSelected(null);
        }}
        onSubmit={(values) => {
          const payload = {
            bookingId: values.bookingId,
            albumId: values.albumId,
            deliverableType: values.deliverableType,
            title: values.title,
            status: values.status,
            expectedDate: values.expectedDate || undefined,
            deliveredDate: values.deliveredDate || undefined,
            notes: values.notes || undefined,
          };

          if (formMode === 'create') {
            createMutation.mutate(payload);
            return;
          }

          if (selected) {
            updateMutation.mutate({
              id: selected.id,
              payload: {
                albumId: values.albumId || null,
                deliverableType: values.deliverableType,
                title: values.title,
                status: values.status,
                expectedDate: values.expectedDate || null,
                deliveredDate: values.deliveredDate || null,
                notes: values.notes || undefined,
              },
            });
          }
        }}
      />

      <DeliveryViewModal
        open={Boolean(viewItem)}
        delivery={viewItem}
        onClose={() => setViewItem(null)}
        onEdit={
          canUpdate && viewItem
            ? () => {
                setFormMode('edit');
                setSelected(viewItem);
                setViewItem(null);
                setFormOpen(true);
              }
            : undefined
        }
      />

      <ArchiveDeliveryDialog
        open={Boolean(archiveItem)}
        delivery={archiveItem}
        isSubmitting={archiveMutation.isPending}
        onClose={() => setArchiveItem(null)}
        onConfirm={() => archiveItem && archiveMutation.mutate(archiveItem.id)}
      />
    </div>
  );
}

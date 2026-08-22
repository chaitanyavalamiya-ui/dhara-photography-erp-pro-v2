import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock3,
  Eye,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ArchiveDeliveryDialog } from '@/components/deliveries/ArchiveDeliveryDialog';
import { DeliveryCountUp } from '@/components/deliveries/DeliveryCountUp';
import { DeliveryFormModal } from '@/components/deliveries/DeliveryFormModal';
import { DeliveryViewModal } from '@/components/deliveries/DeliveryViewModal';
import { deliverableTypeTone, deliveryStatusTone } from '@/components/deliveries/delivery-visual';
import {
  DELIVERABLE_TYPE_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  DeliveryItem,
  DeliveryStatus,
  deliveriesService,
} from '@/services/deliveries-service';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';
import './deliveries/deliveries-page.css';

function DeliveryHeroArt() {
  return (
    <svg viewBox="0 0 220 180" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="delHeroGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#c9a227" />
        </linearGradient>
      </defs>
      <circle cx="118" cy="92" r="78" stroke="url(#delHeroGold)" strokeOpacity="0.2" />
      <circle cx="118" cy="92" r="56" stroke="url(#delHeroGold)" strokeOpacity="0.4" strokeWidth="1.4" />
      <path d="M78 88 L118 62 L158 88 L158 128 L78 128 Z" stroke="url(#delHeroGold)" strokeWidth="2.2" />
      <path d="M78 88 L158 88" stroke="rgba(255,241,201,0.45)" strokeWidth="1.6" />
      <path d="M118 62 L118 128" stroke="rgba(34,211,238,0.45)" strokeWidth="1.4" />
    </svg>
  );
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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

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

  const countKey = ['deliveries', 'counts', search, typeFilter] as const;
  const countBase = {
    page: 1,
    limit: 1,
    search: search || undefined,
    deliverableType: typeFilter,
  };

  const pendingCountQuery = useQuery({
    queryKey: [...countKey, 'pending'],
    queryFn: () => deliveriesService.list({ ...countBase, status: 'pending' }),
  });
  const readyCountQuery = useQuery({
    queryKey: [...countKey, 'ready'],
    queryFn: () => deliveriesService.list({ ...countBase, status: 'ready' }),
  });
  const deliveredCountQuery = useQuery({
    queryKey: [...countKey, 'delivered'],
    queryFn: () => deliveriesService.list({ ...countBase, status: 'delivered' }),
  });

  const pendingCount = pendingCountQuery.data?.total ?? 0;
  const readyCount = readyCountQuery.data?.total ?? 0;
  const deliveredCount = deliveredCountQuery.data?.total ?? 0;
  const totalCount = pendingCount + readyCount + deliveredCount;

  const createMutation = useMutation({
    mutationFn: deliveriesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setFormOpen(false);
      setFeedback({ type: 'success', message: 'Delivery item added.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to add delivery item.'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof deliveriesService.update>[1];
    }) => deliveriesService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setFormOpen(false);
      setSelected(null);
      setViewItem(null);
      setFeedback({ type: 'success', message: 'Delivery item updated.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update delivery item.'),
      });
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
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to archive delivery item.'),
      });
    },
  });

  const totalPages = listQuery.data?.totalPages ?? 1;
  const items = listQuery.data?.items ?? [];

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const openCreate = () => {
    setFormMode('create');
    setSelected(null);
    setFormOpen(true);
  };

  return (
    <>
    <div className="dhara-del">
      <div className="dhara-del-ambient" aria-hidden>
        <span className="dhara-del-orb is-maroon" />
        <span className="dhara-del-orb is-gold" />
        <span className="dhara-del-orb is-cyan" />
      </div>

      <section className="dhara-del-hero">
        <span className="dhara-del-lens" aria-hidden />
        <div>
          <p className="dhara-del-kicker">Dhara Photography ERP Pro</p>
          <h2>Delivery Management</h2>
          <p className="dhara-del-hero-copy">ડિલિવરી — ક્લાયન્ટ ઓર્ડર અને ડિલિવરેબલ ટ્રેકિંગ</p>
          {canCreate && (
            <div className="dhara-del-hero-actions">
              <button type="button" className="dhara-del-btn is-gold" onClick={openCreate}>
                <Plus />
                Add Delivery
              </button>
            </div>
          )}
        </div>
        <div className="dhara-del-hero-art">
          <span className="dhara-del-hero-halo" aria-hidden />
          <DeliveryHeroArt />
        </div>
      </section>

      {feedback && (
        <div className={cn('dhara-del-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
          {feedback.message}
        </div>
      )}

      <div className="dhara-del-kpis">
        <article className="dhara-del-kpi is-gold">
          <div className="dhara-del-kpi-top">
            <div>
              <h3>Total Deliveries</h3>
              <p>Pending + Ready + Delivered</p>
            </div>
            <span className="dhara-del-icon">
              <Package />
            </span>
          </div>
          <strong>
            <DeliveryCountUp value={totalCount} />
          </strong>
        </article>
        <article className="dhara-del-kpi is-cyan">
          <div className="dhara-del-kpi-top">
            <div>
              <h3>Pending</h3>
              <p>Awaiting preparation</p>
            </div>
            <span className="dhara-del-icon">
              <Clock3 />
            </span>
          </div>
          <strong>
            <DeliveryCountUp value={pendingCount} />
          </strong>
        </article>
        <article className="dhara-del-kpi is-amber">
          <div className="dhara-del-kpi-top">
            <div>
              <h3>Ready</h3>
              <p>Ready for handover</p>
            </div>
            <span className="dhara-del-icon">
              <PackageCheck />
            </span>
          </div>
          <strong>
            <DeliveryCountUp value={readyCount} />
          </strong>
        </article>
        <article className="dhara-del-kpi is-green">
          <div className="dhara-del-kpi-top">
            <div>
              <h3>Delivered</h3>
              <p>Completed items</p>
            </div>
            <span className="dhara-del-icon">
              <CheckCircle2 />
            </span>
          </div>
          <strong>
            <DeliveryCountUp value={deliveredCount} />
          </strong>
        </article>
      </div>

      <section className="dhara-del-card">
        <h3>Fulfilment workflow</h3>
        <p className="dhara-del-note" style={{ marginTop: 0, marginBottom: '1rem' }}>
          Real statuses only: Pending → Ready → Delivered. Counts follow the current search and type
          filter.
        </p>
        <div className="dhara-del-flow">
          {(
            [
              { id: 'pending' as DeliveryStatus, label: 'Pending', count: pendingCount, Icon: Clock3 },
              { id: 'ready' as DeliveryStatus, label: 'Ready', count: readyCount, Icon: PackageCheck },
              {
                id: 'delivered' as DeliveryStatus,
                label: 'Delivered',
                count: deliveredCount,
                Icon: CheckCircle2,
              },
            ]
          ).map((stage, index) => (
            <div key={stage.id} className="contents">
              {index > 0 ? <span className="dhara-del-flow-line" aria-hidden /> : null}
              <button
                type="button"
                className={cn(
                  'dhara-del-node',
                  deliveryStatusTone(stage.id),
                  (statusFilter === stage.id || (statusFilter === 'all' && stage.count > 0)) && 'is-on',
                )}
                onClick={() => {
                  setStatusFilter(stage.id);
                  setPage(1);
                }}
              >
                <span className="dhara-del-icon">
                  <stage.Icon />
                </span>
                <div>
                  <span>{stage.label}</span>
                  <strong>{stage.count.toLocaleString('en-IN')}</strong>
                </div>
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="dhara-del-panel">
        <div className="dhara-del-toolbar-row">
          <div className="dhara-del-input-wrap" style={{ flex: '1 1 18rem' }}>
            <Search />
            <input
              className="dhara-del-input is-icon"
              placeholder="Search client, booking, title, notes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearch();
              }}
            />
          </div>
          <div className="dhara-del-field">
            <label htmlFor="delivery-status-filter">Status</label>
            <select
              id="delivery-status-filter"
              className="dhara-del-input"
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
          </div>
          <div className="dhara-del-field">
            <label htmlFor="delivery-type-filter">Deliverable Type</label>
            <select
              id="delivery-type-filter"
              className="dhara-del-input"
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
          </div>
          <button type="button" className="dhara-del-btn is-gold" onClick={applySearch}>
            Search
          </button>
        </div>
      </section>

      {listQuery.isLoading ? (
        <div className="dhara-del-kpis">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="dhara-del-skeleton" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <div className="dhara-del-error">
          <Package />
          <p>Failed to load deliveries.</p>
          <button type="button" className="dhara-del-btn is-gold" onClick={() => void listQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="dhara-del-empty">
          <Package />
          <p>No delivery items found.</p>
          {canCreate && (
            <button type="button" className="dhara-del-btn is-gold" onClick={openCreate}>
              <Plus />
              Add Delivery
            </button>
          )}
        </div>
      ) : (
        <div className="dhara-del-card">
          <div className="dhara-del-table-wrap">
            <table className="dhara-del-table">
              <thead>
                <tr>
                  <th>Deliverable</th>
                  <th>Client / Booking</th>
                  <th>Status</th>
                  <th>Expected</th>
                  <th>Delivered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p>{item.title}</p>
                      <span className={cn('dhara-del-type', deliverableTypeTone(item.deliverableType))}>
                        {item.deliverableTypeLabel}
                      </span>
                      {item.albumName ? <p className="dhara-del-source">{item.albumName}</p> : null}
                    </td>
                    <td>
                      <p>{item.clientName}</p>
                      <p className="dhara-del-source">{item.bookingNumber}</p>
                    </td>
                    <td>
                      <span className={cn('dhara-del-pill', deliveryStatusTone(item.status))}>
                        {item.statusLabel}
                      </span>
                    </td>
                    <td>{formatDate(item.expectedDate)}</td>
                    <td>{formatDate(item.deliveredDate)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="dhara-del-icon-btn"
                          onClick={() => setViewItem(item)}
                          aria-label="View delivery"
                        >
                          <Eye />
                        </button>
                        {canUpdate && (
                          <>
                            <button
                              type="button"
                              className="dhara-del-icon-btn"
                              onClick={() => {
                                setFormMode('edit');
                                setSelected(item);
                                setFormOpen(true);
                              }}
                              aria-label="Edit delivery"
                            >
                              <Pencil />
                            </button>
                            <button
                              type="button"
                              className="dhara-del-icon-btn"
                              onClick={() => setArchiveItem(item)}
                              aria-label="Archive delivery"
                            >
                              <Trash2 />
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

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="dhara-del-note">
                Page {page} of {totalPages} · {listQuery.data?.total ?? 0} deliveries
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="dhara-del-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="dhara-del-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>

      <DeliveryFormModal
        open={formOpen}
        mode={formMode}
        delivery={selected}
        premium
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
    </>
  );
}

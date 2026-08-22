import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDown,
  Cake,
  Clock3,
  Heart,
  IndianRupee,
  Phone,
  Plus,
  Search,
  Eye,
  Pencil,
  RotateCcw,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Client,
  ClientFormData,
  ClientSortField,
  clientsService,
} from '@/services/clients-service';
import { useAuthStore } from '@/stores/auth-store';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { ClientViewModal } from '@/components/clients/ClientViewModal';
import { DeleteClientDialog } from '@/components/clients/DeleteClientDialog';
import { ClientAvatar } from '@/components/clients/client-avatar';
import { formatCurrency, formatDate } from '@/utils/client-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';
import './clients/clients-page.css';

type StatusFilter = 'active' | 'inactive' | 'all';

function monthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

/** LOCKED CLIENTS MANAGEMENT MODULE — DO NOT MODIFY WITHOUT EXPLICIT USER APPROVAL */
export function ClientsPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [sortBy, setSortBy] = useState<ClientSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearchInput(q);
      setSearch(q);
      setPage(1);
    }
  }, [searchParams]);

  const canCreate = hasPermission('clients.create');
  const canUpdate = hasPermission('clients.update');
  const canArchive = hasPermission('clients.archive');

  const listQuery = useQuery({
    queryKey: ['clients', page, search, statusFilter, sortBy, sortOrder],
    queryFn: () =>
      clientsService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        sortBy,
        sortOrder,
      }),
  });

  const upcomingQuery = useQuery({
    queryKey: ['clients', 'upcoming-events'],
    queryFn: clientsService.getUpcomingEvents,
  });

  const censusQuery = useQuery({
    queryKey: ['clients', 'census'],
    queryFn: async () => {
      const [all, active] = await Promise.all([
        clientsService.list({ page: 1, limit: 100, status: 'all', sortBy: 'createdAt', sortOrder: 'desc' }),
        clientsService.list({ page: 1, limit: 1, status: 'active' }),
      ]);
      const start = monthStartIso();
      return {
        total: all.total,
        active: active.total,
        newThisMonth: all.items.filter((client) => new Date(client.createdAt).getTime() >= start).length,
        business: all.items.reduce((sum, client) => sum + client.totalAmount, 0),
        pending: all.items.reduce((sum, client) => sum + client.outstandingBalance, 0),
        capped: all.total > all.items.length,
      };
    },
  });

  const createMutation = useMutation({
    mutationFn: clientsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setFormOpen(false);
      setSelectedClient(null);
      setFeedback({ type: 'success', message: 'Client added successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to add client.'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientFormData> }) =>
      clientsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setFormOpen(false);
      setSelectedClient(null);
      setViewClient(null);
      setFeedback({ type: 'success', message: 'Client updated successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update client.'),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: clientsService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDeleteClient(null);
      setViewClient(null);
      setFeedback({ type: 'success', message: 'Client deleted successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to delete client.'),
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: clientsService.restore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setFeedback({ type: 'success', message: 'Client restored successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to restore client.'),
      });
    },
  });

  const clients = listQuery.data?.items ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  const birthdays = useMemo(
    () => upcomingQuery.data?.filter((event) => event.eventType === 'birthday') ?? [],
    [upcomingQuery.data],
  );
  const anniversaries = useMemo(
    () => upcomingQuery.data?.filter((event) => event.eventType === 'anniversary') ?? [],
    [upcomingQuery.data],
  );

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const toggleSort = (field: ClientSortField) => {
    setPage(1);
    if (sortBy === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortOrder('asc');
  };

  const openCreate = () => {
    setFormMode('create');
    setSelectedClient(null);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setFormMode('edit');
    setSelectedClient(client);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: ClientFormData) => {
    if (formMode === 'create') {
      createMutation.mutate(data);
      return;
    }

    if (selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, data });
    }
  };

  const census = censusQuery.data;
  const moneyNote = census?.capped ? 'From latest 100 client records' : 'Across studio client records';

  const renderActions = (client: Client) => (
    <div className="dhara-clients-actions">
      <button type="button" onClick={() => setViewClient(client)} aria-label="View client">
        <Eye />
      </button>
      {canUpdate && !client.archivedAt && (
        <button type="button" onClick={() => openEdit(client)} aria-label="Edit client">
          <Pencil />
        </button>
      )}
      {canArchive && client.archivedAt && (
        <button type="button" onClick={() => restoreMutation.mutate(client.id)} aria-label="Restore client">
          <RotateCcw />
        </button>
      )}
      {canArchive && !client.archivedAt && (
        <button
          type="button"
          className="is-danger"
          onClick={() => setDeleteClient(client)}
          aria-label="Delete client"
        >
          <Trash2 />
        </button>
      )}
    </div>
  );

  return (
    <div className="dhara-clients">
      <section className="dhara-clients-hero">
        <div>
          <p className="dhara-clients-kicker">Dhara Photography ERP Pro</p>
          <h2>Clients Management</h2>
          <p>તમારા તમામ ગ્રાહકોની સંપૂર્ણ માહિતી એક જ જગ્યાએ.</p>
        </div>
        <div className="dhara-clients-hero-art" aria-hidden>
          <svg viewBox="0 0 120 90" width="120" height="90" fill="none">
            <circle cx="60" cy="45" r="28" stroke="#ffd45a" strokeOpacity="0.45" />
            <circle cx="60" cy="45" r="14" stroke="#c084fc" strokeOpacity="0.7" />
            <circle cx="60" cy="45" r="4" fill="#ffd45a" />
          </svg>
        </div>
      </section>

      <div className="dhara-clients-kpis">
        <article className="dhara-clients-card dhara-clients-kpi is-gold">
          <div className="dhara-clients-kpi-top">
            <h3>Total Clients</h3>
            <span className="dhara-clients-icon">
              <Users />
            </span>
          </div>
          <strong>{censusQuery.isLoading ? '—' : String(census?.total ?? 0)}</strong>
          <span>All studio client records</span>
        </article>
        <article className="dhara-clients-card dhara-clients-kpi is-cyan">
          <div className="dhara-clients-kpi-top">
            <h3>New Clients</h3>
            <span className="dhara-clients-icon">
              <UserPlus />
            </span>
          </div>
          <strong>{censusQuery.isLoading ? '—' : String(census?.newThisMonth ?? 0)}</strong>
          <span>{census?.active ?? 0} currently active</span>
        </article>
        <article className="dhara-clients-card dhara-clients-kpi is-magenta">
          <div className="dhara-clients-kpi-top">
            <h3>Total Business</h3>
            <span className="dhara-clients-icon">
              <IndianRupee />
            </span>
          </div>
          <strong>{censusQuery.isLoading ? '—' : formatCurrency(census?.business ?? 0)}</strong>
          <span>{moneyNote}</span>
        </article>
        <article className="dhara-clients-card dhara-clients-kpi is-amber">
          <div className="dhara-clients-kpi-top">
            <h3>Pending Payment</h3>
            <span className="dhara-clients-icon">
              <Clock3 />
            </span>
          </div>
          <strong>{censusQuery.isLoading ? '—' : formatCurrency(census?.pending ?? 0)}</strong>
          <span>{moneyNote}</span>
        </article>
      </div>

      {feedback && (
        <div className={cn('dhara-clients-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
          {feedback.message}
        </div>
      )}

      <div className="dhara-clients-events">
        <div className="dhara-clients-panel">
          <div className="mb-4 flex items-center gap-2">
            <span className="dhara-clients-icon is-gold">
              <Cake />
            </span>
            <h3>Upcoming Birthdays</h3>
          </div>
          {upcomingQuery.isLoading ? (
            <p>Loading upcoming birthdays...</p>
          ) : birthdays.length === 0 ? (
            <p>No upcoming birthdays in the next 30 days.</p>
          ) : (
            birthdays.slice(0, 5).map((event) => (
              <div key={`${event.clientId}-birthday`} className="dhara-clients-event">
                <div>
                  <p className="m-0 font-semibold">{event.clientName}</p>
                  <small>{formatDate(event.eventDate)}</small>
                </div>
                <span className="dhara-clients-badge is-ok">
                  {event.daysUntil === 0 ? 'Today' : `In ${event.daysUntil} days`}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="dhara-clients-panel">
          <div className="mb-4 flex items-center gap-2">
            <span className="dhara-clients-icon is-magenta">
              <Heart />
            </span>
            <h3>Upcoming Anniversaries</h3>
          </div>
          {upcomingQuery.isLoading ? (
            <p>Loading upcoming anniversaries...</p>
          ) : anniversaries.length === 0 ? (
            <p>No upcoming anniversaries in the next 30 days.</p>
          ) : (
            anniversaries.slice(0, 5).map((event) => (
              <div key={`${event.clientId}-anniversary`} className="dhara-clients-event">
                <div>
                  <p className="m-0 font-semibold">{event.clientName}</p>
                  <small>{formatDate(event.eventDate)}</small>
                </div>
                <span className="dhara-clients-badge is-ok">
                  {event.daysUntil === 0 ? 'Today' : `In ${event.daysUntil} days`}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="dhara-clients-panel">
        <div className="dhara-clients-toolbar">
          <form onSubmit={handleSearchSubmit} className="dhara-clients-search">
            <Search />
            <input
              placeholder="Search by name, mobile number or city..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              aria-label="Search clients"
            />
          </form>

          <div className="dhara-clients-controls">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                className={cn('dhara-clients-chip', statusFilter === status && 'is-on')}
                onClick={() => {
                  setPage(1);
                  setStatusFilter(status);
                }}
              >
                {status === 'all' ? 'All Clients' : status === 'active' ? 'Active' : 'Archived'}
              </button>
            ))}
            <select
              id="status-filter"
              className="sr-only"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as StatusFilter);
              }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
            <select
              className="dhara-clients-select"
              aria-label="Sort clients"
              value={`${sortBy}:${sortOrder}`}
              onChange={(event) => {
                const [field, order] = event.target.value.split(':') as [ClientSortField, 'asc' | 'desc'];
                setPage(1);
                setSortBy(field);
                setSortOrder(order);
              }}
            >
              <option value="createdAt:desc">Newest</option>
              <option value="fullName:asc">Name A–Z</option>
              <option value="totalAmount:desc">Highest business</option>
              <option value="outstandingBalance:desc">Highest pending</option>
            </select>
            {canCreate && (
              <button type="button" className="dhara-clients-add" data-robo-target="add-client" onClick={openCreate}>
                <Plus />
                Add New Client
              </button>
            )}
          </div>
        </div>

        {listQuery.isLoading ? (
          <div className="dhara-clients-kpis">
            <div className="dhara-clients-skel" />
            <div className="dhara-clients-skel" />
            <div className="dhara-clients-skel" />
          </div>
        ) : listQuery.isError ? (
          <div className="dhara-clients-error">
            <h3>Could not load clients</h3>
            <p>Client data could not be loaded. Please try again.</p>
            <button type="button" className="dhara-clients-add mt-4" onClick={() => void listQuery.refetch()}>
              Retry
            </button>
          </div>
        ) : clients.length === 0 ? (
          <div className="dhara-clients-empty">
            <span className="dhara-clients-icon mx-auto">
              <Users />
            </span>
            <h3>
              {search || statusFilter !== 'active' ? 'No clients match your search.' : 'No clients yet.'}
            </h3>
            <p>
              {search || statusFilter !== 'active'
                ? 'Try a different name, mobile, or status filter.'
                : 'તમારા સ્ટુડિયોની ક્લાયન્ટ યાદી અહીંથી શરૂ કરો. Start building your studio client list by adding your first client.'}
            </p>
            {canCreate && (
              <button type="button" className="dhara-clients-add mt-5" data-robo-target="add-client" onClick={openCreate}>
                <Plus />
                Add Your First Client
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="dhara-clients-table-wrap">
              <table className="dhara-clients-table">
                <thead>
                  <tr>
                    {[
                      { key: 'fullName', label: 'Client' },
                      { key: 'mobile', label: 'Mobile' },
                      { key: 'city', label: 'City / Location' },
                      { key: 'totalBookings', label: 'Total Bookings' },
                      { key: 'totalAmount', label: 'Total Business' },
                      { key: 'outstandingBalance', label: 'Pending' },
                      { key: 'status', label: 'Status', sortable: false },
                    ].map((column) => (
                      <th key={column.key}>
                        {column.sortable === false ? (
                          column.label
                        ) : (
                          <button type="button" onClick={() => toggleSort(column.key as ClientSortField)}>
                            {column.label}
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <div className="dhara-clients-name">
                          <ClientAvatar name={client.fullName} />
                          <div>
                            <p>{client.fullName}</p>
                            <small>
                              {client.clientNumber}
                              {client.email ? ` · ${client.email}` : ''}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {client.mobile}
                        </span>
                      </td>
                      <td>{client.city || client.address || '—'}</td>
                      <td>{client.totalBookings}</td>
                      <td className="dhara-clients-money">{formatCurrency(client.totalAmount)}</td>
                      <td className="dhara-clients-money is-pending">
                        {formatCurrency(client.outstandingBalance)}
                      </td>
                      <td>
                        <span className={cn('dhara-clients-badge', client.isActive ? 'is-ok' : 'is-off')}>
                          {client.status}
                        </span>
                      </td>
                      <td>{renderActions(client)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="dhara-clients-cards">
              {clients.map((client) => (
                <article key={client.id} className="dhara-clients-card dhara-clients-mobile-card">
                  <div className="dhara-clients-name">
                    <ClientAvatar name={client.fullName} />
                    <div>
                      <p>{client.fullName}</p>
                      <small>{client.mobile}</small>
                    </div>
                  </div>
                  <p className="mt-3">{client.city || '—'}</p>
                  <p className="dhara-clients-money mt-1">{formatCurrency(client.totalAmount)}</p>
                  <p className="dhara-clients-money is-pending">{formatCurrency(client.outstandingBalance)}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={cn('dhara-clients-badge', client.isActive ? 'is-ok' : 'is-off')}>
                      {client.status}
                    </span>
                    {renderActions(client)}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {!listQuery.isLoading && clients.length > 0 && (
          <div className="dhara-clients-pager">
            <p>
              Page {page} of {totalPages} · {listQuery.data?.total ?? 0} clients
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="dhara-clients-ghost"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="dhara-clients-ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ClientFormModal
        open={formOpen}
        mode={formMode}
        client={selectedClient}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setFormOpen(false);
          setSelectedClient(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <ClientViewModal
        open={Boolean(viewClient)}
        client={viewClient}
        canEdit={canUpdate}
        onClose={() => setViewClient(null)}
        onEdit={(client) => {
          setViewClient(null);
          openEdit(client);
        }}
      />

      <DeleteClientDialog
        open={Boolean(deleteClient)}
        client={deleteClient}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeleteClient(null)}
        onConfirm={() => {
          if (deleteClient) {
            deleteMutation.mutate(deleteClient.id);
          }
        }}
      />
    </div>
  );
}

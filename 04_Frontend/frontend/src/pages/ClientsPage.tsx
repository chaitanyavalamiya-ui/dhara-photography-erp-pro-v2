import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDown,
  Cake,
  Heart,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
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
import { formatCurrency, formatDate } from '@/utils/client-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

type StatusFilter = 'active' | 'inactive' | 'all';

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-100">Clients</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage studio clients, contact details, and upcoming celebrations.
          </p>
        </div>
        {canCreate && (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
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

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card border-gold/20">
          <div className="mb-4 flex items-center gap-2">
            <Cake className="h-5 w-5 text-gold" />
            <h3 className="font-display text-lg font-semibold text-gold">Upcoming Birthdays</h3>
          </div>
          {upcomingQuery.isLoading ? (
            <p className="text-sm text-gray-500">Loading upcoming birthdays...</p>
          ) : birthdays.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming birthdays in the next 30 days.</p>
          ) : (
            <div className="space-y-3">
              {birthdays.slice(0, 5).map((event) => (
                <div
                  key={`${event.clientId}-birthday`}
                  className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-elevated px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-100">{event.clientName}</p>
                    <p className="text-xs text-gray-500">{formatDate(event.eventDate)}</p>
                  </div>
                  <span className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
                    {event.daysUntil === 0 ? 'Today' : `In ${event.daysUntil} days`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card border-gold/20">
          <div className="mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-gold" />
            <h3 className="font-display text-lg font-semibold text-gold">Upcoming Anniversaries</h3>
          </div>
          {upcomingQuery.isLoading ? (
            <p className="text-sm text-gray-500">Loading upcoming anniversaries...</p>
          ) : anniversaries.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming anniversaries in the next 30 days.</p>
          ) : (
            <div className="space-y-3">
              {anniversaries.slice(0, 5).map((event) => (
                <div
                  key={`${event.clientId}-anniversary`}
                  className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-elevated px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-100">{event.clientName}</p>
                    <p className="text-xs text-gray-500">{formatDate(event.eventDate)}</p>
                  </div>
                  <span className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
                    {event.daysUntil === 0 ? 'Today' : `In ${event.daysUntil} days`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              className="input-field pl-10"
              placeholder="Search by name, mobile, email, or city"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-400" htmlFor="status-filter">
              Status
            </label>
            <select
              id="status-filter"
              className="input-field w-auto min-w-[140px]"
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
          </div>
        </div>

        {listQuery.isLoading ? (
          <div className="flex min-h-48 items-center justify-center text-gray-500">
            Loading clients...
          </div>
        ) : listQuery.isError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
            Failed to load clients. Please try again.
          </div>
        ) : clients.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-surface-border px-6 py-10 text-center">
            <Users className="mb-3 h-10 w-10 text-gray-600" />
            <h3 className="font-display text-lg font-semibold text-gray-200">No clients yet</h3>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              Start building your studio client list by adding your first client.
            </p>
            {canCreate && (
              <button type="button" className="btn-primary mt-5" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                  {[
                    { key: 'fullName', label: 'Client Name' },
                    { key: 'mobile', label: 'Mobile Number' },
                    { key: 'email', label: 'Email' },
                    { key: 'address', label: 'Address', sortable: false },
                    { key: 'city', label: 'City' },
                    { key: 'dateOfBirth', label: 'Birthday', sortable: false },
                    { key: 'anniversaryDate', label: 'Anniversary', sortable: false },
                    { key: 'totalBookings', label: 'Total Bookings' },
                    { key: 'totalAmount', label: 'Total Amount' },
                    { key: 'outstandingBalance', label: 'Outstanding Balance' },
                    { key: 'status', label: 'Status', sortable: false },
                  ].map((column) => (
                    <th key={column.key} className="px-3 py-3 font-medium">
                      {column.sortable === false ? (
                        column.label
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-gold"
                          onClick={() => toggleSort(column.key as ClientSortField)}
                        >
                          {column.label}
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-surface-border/70 transition hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-4">
                      <div>
                        <p className="font-medium text-gray-100">{client.fullName}</p>
                        <p className="text-xs text-gray-500">{client.clientNumber}</p>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-gray-300">{client.mobile}</td>
                    <td className="px-3 py-4 text-gray-300">{client.email || '—'}</td>
                    <td className="px-3 py-4 text-gray-300">{client.address || '—'}</td>
                    <td className="px-3 py-4 text-gray-300">{client.city || '—'}</td>
                    <td className="px-3 py-4 text-gray-300">{formatDate(client.dateOfBirth)}</td>
                    <td className="px-3 py-4 text-gray-300">
                      {formatDate(client.anniversaryDate)}
                    </td>
                    <td className="px-3 py-4 text-gray-300">{client.totalBookings}</td>
                    <td className="px-3 py-4 text-gray-300">
                      {formatCurrency(client.totalAmount)}
                    </td>
                    <td className="px-3 py-4 text-gray-300">
                      {formatCurrency(client.outstandingBalance)}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          client.isActive
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-400',
                        )}
                      >
                        {client.status}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
                          onClick={() => setViewClient(client)}
                          aria-label="View client"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canUpdate && (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
                            onClick={() => openEdit(client)}
                            aria-label="Edit client"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canArchive && (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-red-400"
                            onClick={() => setDeleteClient(client)}
                            aria-label="Delete client"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!listQuery.isLoading && clients.length > 0 && (
          <div className="mt-5 flex items-center justify-between border-t border-surface-border pt-4 text-sm text-gray-500">
            <p>
              Page {page} of {totalPages} · {listQuery.data?.total ?? 0} clients
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

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Search, Settings2 } from 'lucide-react';
import { settingsService, SettingsServiceRate } from '@/services/settings-service';
import { useAuthStore } from '@/stores/auth-store';
import { EditServiceRateModal } from '@/components/settings/EditServiceRateModal';
import { formatCurrency } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatUnitLabel(unit: string): string {
  return unit === 'day' ? 'Per day' : 'Per piece';
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('settings.update');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'service' | 'album'>('all');
  const [editRate, setEditRate] = useState<SettingsServiceRate | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const ratesQuery = useQuery({
    queryKey: ['settings', 'service-rates'],
    queryFn: settingsService.getServiceRates,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, defaultRate }: { id: string; defaultRate: number }) =>
      settingsService.updateServiceRate(id, { defaultRate }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'service-rates'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'service-rates'] });
      setEditRate(null);
      setFeedback({
        type: 'success',
        message: `${updated.name} rate updated to ${formatCurrency(updated.defaultRate)}.`,
      });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update service rate.'),
      });
    },
  });

  const filteredRates = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (ratesQuery.data ?? []).filter((rate) => {
      const matchesCategory = categoryFilter === 'all' || rate.category === categoryFilter;
      const matchesSearch =
        !term ||
        rate.name.toLowerCase().includes(term) ||
        rate.code.toLowerCase().includes(term) ||
        rate.category.toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [ratesQuery.data, search, categoryFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-100">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage studio configuration and service pricing.
        </p>
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

      <div className="card border-gold/20">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15">
              <Settings2 className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-gold">Service Rates</h3>
              <p className="text-sm text-gray-500">
                Studio pricing used automatically in new bookings.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                className="input-field w-full pl-10 sm:w-64"
                placeholder="Search services..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              className="input-field w-full sm:w-40"
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as 'all' | 'service' | 'album')
              }
            >
              <option value="all">All categories</option>
              <option value="service">Services</option>
              <option value="album">Albums</option>
            </select>
          </div>
        </div>

        {ratesQuery.isLoading ? (
          <div className="flex min-h-48 items-center justify-center text-gray-500">
            Loading service rates...
          </div>
        ) : ratesQuery.isError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
            Failed to load service rates.
          </div>
        ) : filteredRates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-surface-border px-6 py-10 text-center text-sm text-gray-500">
            No service rates match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-3 font-medium">Service Name</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Unit</th>
                  <th className="px-3 py-3 font-medium">Current Rate</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Last Updated</th>
                  {canUpdate && <th className="px-3 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRates.map((rate) => (
                  <tr
                    key={rate.id}
                    className="border-b border-surface-border/70 transition hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-4">
                      <p className="font-medium text-gray-100">{rate.name}</p>
                      <p className="text-xs text-gray-500">{rate.code}</p>
                    </td>
                    <td className="px-3 py-4 capitalize text-gray-300">{rate.category}</td>
                    <td className="px-3 py-4 text-gray-300">{formatUnitLabel(rate.unit)}</td>
                    <td className="px-3 py-4 font-semibold text-gold">
                      {formatCurrency(rate.defaultRate)}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          rate.isActive
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-400',
                        )}
                      >
                        {rate.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs text-gray-500">
                      {formatUpdatedAt(rate.updatedAt)}
                    </td>
                    {canUpdate && (
                      <td className="px-3 py-4">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:border-gold/40 hover:text-gold"
                          onClick={() => setEditRate(rate)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditServiceRateModal
        open={Boolean(editRate)}
        rate={editRate}
        isSubmitting={updateMutation.isPending}
        onClose={() => setEditRate(null)}
        onSubmit={(defaultRate) => {
          if (editRate) {
            updateMutation.mutate({ id: editRate.id, defaultRate });
          }
        }}
      />
    </div>
  );
}

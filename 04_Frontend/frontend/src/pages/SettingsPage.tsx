import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Building2, Boxes, History, ListTree, Pencil, Plus, Search, Settings2 } from 'lucide-react';
import {
  MasterDataCategory,
  MasterDataItem,
  settingsService,
  SettingsServiceRate,
  StudioPackage,
} from '@/services/settings-service';
import { PackageFormModal } from '@/components/settings/PackageFormModal';
import { auditService } from '@/services/audit-service';
import { useAuthStore } from '@/stores/auth-store';
import { EditServiceRateModal } from '@/components/settings/EditServiceRateModal';
import { AddMasterDataModal } from '@/components/settings/AddMasterDataModal';
import { EditMasterDataModal } from '@/components/settings/EditMasterDataModal';
import { formatCurrency } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { RolesPermissionsPanel } from '@/components/settings/RolesPermissionsPanel';
import { AppearancePanel } from '@/components/settings/AppearancePanel';
import { BackupRestorePanel } from '@/components/settings/BackupRestorePanel';
import { cn } from '@/utils/cn';

type SettingsTab =
  | 'studio-profile'
  | 'packages'
  | 'service-rates'
  | 'expense-categories'
  | 'payment-modes'
  | 'activity-log'
  | 'roles-permissions'
  | 'appearance'
  | 'backup-restore';

const TAB_CONFIG: { id: SettingsTab; label: string; category?: MasterDataCategory }[] = [
  { id: 'studio-profile', label: 'Studio Profile' },
  { id: 'packages', label: 'Packages' },
  { id: 'service-rates', label: 'Service Rates' },
  { id: 'expense-categories', label: 'Expense Categories', category: 'expense_category' },
  { id: 'payment-modes', label: 'Payment Modes', category: 'payment_mode' },
  { id: 'activity-log', label: 'Activity Log' },
  { id: 'roles-permissions', label: 'Roles & Permissions' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'backup-restore', label: 'Backup & Restore' },
];

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
  const canViewRoles = hasPermission('roles.read');

  const visibleTabs = useMemo(
    () => TAB_CONFIG.filter((item) => item.id !== 'roles-permissions' || canViewRoles),
    [canViewRoles],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<SettingsTab>('studio-profile');
  const [search, setSearch] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'service' | 'album'>('all');
  const [editRate, setEditRate] = useState<SettingsServiceRate | null>(null);
  const [editMasterData, setEditMasterData] = useState<MasterDataItem | null>(null);
  const [editPackage, setEditPackage] = useState<StudioPackage | null>(null);
  const [packageFormOpen, setPackageFormOpen] = useState(false);
  const [packageFormMode, setPackageFormMode] = useState<'create' | 'edit'>('create');
  const [addMasterDataOpen, setAddMasterDataOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (raw && visibleTabs.some((item) => item.id === raw)) {
      setTab(raw as SettingsTab);
      return;
    }
    if (!raw) {
      setTab(visibleTabs[0]?.id ?? 'studio-profile');
    }
  }, [visibleTabs, searchParams]);

  const activeTab = visibleTabs.find((item) => item.id === tab) ?? visibleTabs[0];
  const masterDataCategory = activeTab.category;

  const packagesQuery = useQuery({
    queryKey: ['settings', 'packages', true],
    queryFn: () => settingsService.getPackages(true),
    enabled: tab === 'packages',
  });

  const companyQuery = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: settingsService.getCompanyProfile,
    enabled: tab === 'studio-profile',
  });

  const auditQuery = useQuery({
    queryKey: ['audit', 'logs', auditPage, search],
    queryFn: () =>
      auditService.list({
        page: auditPage,
        limit: 30,
        search: search || undefined,
      }),
    enabled: tab === 'activity-log',
  });

  const ratesQuery = useQuery({
    queryKey: ['settings', 'service-rates'],
    queryFn: settingsService.getServiceRates,
    enabled: tab === 'service-rates',
  });

  const masterDataQuery = useQuery({
    queryKey: ['settings', 'master-data', masterDataCategory, true],
    queryFn: () => settingsService.getMasterData(masterDataCategory!, true),
    enabled: Boolean(masterDataCategory),
  });

  const updateRateMutation = useMutation({
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

  const createMasterDataMutation = useMutation({
    mutationFn: settingsService.createMasterData,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'master-data'] });
      setAddMasterDataOpen(false);
      setFeedback({ type: 'success', message: `${created.label} added successfully.` });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to add lookup item.'),
      });
    },
  });

  const updateMasterDataMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof settingsService.updateMasterData>[1] }) =>
      settingsService.updateMasterData(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'master-data'] });
      setEditMasterData(null);
      setFeedback({ type: 'success', message: `${updated.label} updated successfully.` });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update lookup item.'),
      });
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: settingsService.createPackage,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'packages'] });
      setPackageFormOpen(false);
      setFeedback({ type: 'success', message: `${created.label} package created.` });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to create package.'),
      });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof settingsService.updatePackage>[1] }) =>
      settingsService.updatePackage(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'packages'] });
      setPackageFormOpen(false);
      setEditPackage(null);
      setFeedback({ type: 'success', message: `${updated.label} package updated.` });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update package.'),
      });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: settingsService.updateCompanyProfile,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'company'] });
      setFeedback({ type: 'success', message: `Studio name updated to ${updated.name}.` });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update studio profile.'),
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

  const filteredMasterData = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (masterDataQuery.data ?? []).filter((item) => {
      if (!term) return true;
      return (
        item.label.toLowerCase().includes(term) || item.code.toLowerCase().includes(term)
      );
    });
  }, [masterDataQuery.data, search]);

  const filteredPackages = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (packagesQuery.data ?? []).filter((pkg) => {
      if (!term) return true;
      return (
        pkg.label.toLowerCase().includes(term) ||
        pkg.code.toLowerCase().includes(term) ||
        (pkg.description ?? '').toLowerCase().includes(term)
      );
    });
  }, [packagesQuery.data, search]);

  useEffect(() => {
    if (companyQuery.data) {
      setCompanyName(companyQuery.data.name);
    }
  }, [companyQuery.data]);

  const isMasterDataTab = tab === 'expense-categories' || tab === 'payment-modes';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-100">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage studio configuration, pricing, and lookup data.
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

      <div className="dhara-page-tabs flex flex-wrap gap-2 border-b border-surface-border pb-1">
        {visibleTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setSearch('');
              setAuditPage(1);
              setSearchParams(item.id === 'studio-profile' ? {} : { tab: item.id }, { replace: true });
            }}
            className={cn(
              'rounded-t-lg px-4 py-2 text-sm font-medium transition',
              tab === item.id
                ? 'border-b-2 border-gold text-gold'
                : 'text-gray-500 hover:text-gray-300',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'roles-permissions' ? (
        <RolesPermissionsPanel onFeedback={setFeedback} />
      ) : tab === 'appearance' ? (
        <AppearancePanel />
      ) : tab === 'backup-restore' ? (
        <BackupRestorePanel onFeedback={setFeedback} />
      ) : (
      <div className="card border-gold/20">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15">
              {tab === 'studio-profile' ? (
                <Building2 className="h-5 w-5 text-gold" />
              ) : tab === 'packages' ? (
                <Boxes className="h-5 w-5 text-gold" />
              ) : tab === 'activity-log' ? (
                <History className="h-5 w-5 text-gold" />
              ) : tab === 'service-rates' ? (
                <Settings2 className="h-5 w-5 text-gold" />
              ) : (
                <ListTree className="h-5 w-5 text-gold" />
              )}
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-gold">{activeTab.label}</h3>
              <p className="text-sm text-gray-500">
                {tab === 'studio-profile'
                  ? 'Studio identity shown across the ERP.'
                  : tab === 'packages'
                    ? 'Predefined service bundles for faster bookings.'
                    : tab === 'activity-log'
                    ? 'System audit trail for key actions.'
                    : tab === 'service-rates'
                      ? 'Studio pricing used automatically in new bookings.'
                      : 'Lookup options used in expense and payment forms.'}
              </p>
            </div>
          </div>

          {(tab === 'service-rates' || isMasterDataTab || tab === 'activity-log' || tab === 'packages') && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                className="input-field w-full pl-10 sm:w-64"
                placeholder="Search..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && tab === 'activity-log') {
                    setAuditPage(1);
                  }
                }}
              />
            </div>
            {tab === 'service-rates' && (
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
            )}
            {tab === 'packages' && canUpdate && (
              <button
                type="button"
                className="btn-primary inline-flex items-center"
                onClick={() => {
                  setPackageFormMode('create');
                  setEditPackage(null);
                  setPackageFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Package
              </button>
            )}
            {isMasterDataTab && canUpdate && (
              <button
                type="button"
                className="btn-primary inline-flex items-center"
                onClick={() => setAddMasterDataOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </button>
            )}
            {tab === 'activity-log' && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setAuditPage(1);
                  auditQuery.refetch();
                }}
              >
                Search
              </button>
            )}
          </div>
          )}
        </div>

        {tab === 'studio-profile' ? (
          companyQuery.isLoading ? (
            <div className="flex min-h-48 items-center justify-center text-gray-500">
              Loading studio profile...
            </div>
          ) : companyQuery.isError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
              Failed to load studio profile.
            </div>
          ) : (
            <div className="max-w-lg space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-gray-300">Studio Name</label>
                <input
                  className="input-field"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  disabled={!canUpdate}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-300">Studio Code</label>
                <input className="input-field font-mono text-sm" value={companyQuery.data?.code ?? ''} disabled />
              </div>
              {canUpdate && (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={updateCompanyMutation.isPending || !companyName.trim()}
                  onClick={() => updateCompanyMutation.mutate({ name: companyName.trim() })}
                >
                  {updateCompanyMutation.isPending ? 'Saving...' : 'Save Profile'}
                </button>
              )}
            </div>
          )
        ) : tab === 'packages' ? (
          packagesQuery.isLoading ? (
            <div className="flex min-h-48 items-center justify-center text-gray-500">
              Loading packages...
            </div>
          ) : packagesQuery.isError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
              Failed to load packages.
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-surface-border px-6 py-10 text-center text-sm text-gray-500">
              No packages match your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-3 font-medium">Package</th>
                    <th className="px-3 py-3 font-medium">Services</th>
                    <th className="px-3 py-3 font-medium">Default Price</th>
                    <th className="px-3 py-3 font-medium">Offer Price</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    {canUpdate && <th className="px-3 py-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredPackages.map((pkg) => (
                    <tr key={pkg.id} className="border-b border-surface-border/70 hover:bg-white/[0.02]">
                      <td className="px-3 py-4">
                        <p className="font-medium text-gray-100">{pkg.label}</p>
                        <p className="text-xs text-gray-500">{pkg.code}</p>
                      </td>
                      <td className="px-3 py-4 text-gray-300">{pkg.items.length} services</td>
                      <td className="px-3 py-4 font-semibold text-gold">{formatCurrency(pkg.defaultPrice)}</td>
                      <td className="px-3 py-4 text-gray-300">
                        {pkg.offerPrice !== null ? formatCurrency(pkg.offerPrice) : '—'}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-medium',
                            pkg.isActive
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-gray-500/10 text-gray-400',
                          )}
                        >
                          {pkg.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {canUpdate && (
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:border-gold/40 hover:text-gold"
                            onClick={() => {
                              setPackageFormMode('edit');
                              setEditPackage(pkg);
                              setPackageFormOpen(true);
                            }}
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
          )
        ) : tab === 'activity-log' ? (
          auditQuery.isLoading ? (
            <div className="flex min-h-48 items-center justify-center text-gray-500">
              Loading activity log...
            </div>
          ) : auditQuery.isError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
              Failed to load activity log.
            </div>
          ) : (auditQuery.data?.items.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-dashed border-surface-border px-6 py-10 text-center text-sm text-gray-500">
              No activity found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-3 font-medium">When</th>
                    <th className="px-3 py-3 font-medium">User</th>
                    <th className="px-3 py-3 font-medium">Module</th>
                    <th className="px-3 py-3 font-medium">Action</th>
                    <th className="px-3 py-3 font-medium">Record</th>
                  </tr>
                </thead>
                <tbody>
                  {auditQuery.data?.items.map((entry) => (
                    <tr key={entry.id} className="border-b border-surface-border/70 hover:bg-white/[0.02]">
                      <td className="px-3 py-4 text-xs text-gray-500">{formatUpdatedAt(entry.createdAt)}</td>
                      <td className="px-3 py-4 text-gray-300">{entry.actorName ?? 'System'}</td>
                      <td className="px-3 py-4 capitalize text-gray-300">{entry.module}</td>
                      <td className="px-3 py-4 text-gray-300">{entry.action}</td>
                      <td className="px-3 py-4 text-xs text-gray-500">
                        {entry.recordType} · {entry.recordId.slice(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(auditQuery.data?.totalPages ?? 1) > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-surface-border pt-4">
                  <p className="text-sm text-gray-500">
                    Page {auditPage} of {auditQuery.data?.totalPages ?? 1}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={auditPage >= (auditQuery.data?.totalPages ?? 1)}
                      onClick={() =>
                        setAuditPage((current) =>
                          Math.min(auditQuery.data?.totalPages ?? current, current + 1),
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        ) : tab === 'service-rates' ? (
          ratesQuery.isLoading ? (
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
          )
        ) : masterDataQuery.isLoading ? (
          <div className="flex min-h-48 items-center justify-center text-gray-500">
            Loading lookup items...
          </div>
        ) : masterDataQuery.isError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
            Failed to load lookup items.
          </div>
        ) : filteredMasterData.length === 0 ? (
          <div className="rounded-lg border border-dashed border-surface-border px-6 py-10 text-center text-sm text-gray-500">
            No items match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-3 font-medium">Label</th>
                  <th className="px-3 py-3 font-medium">Code</th>
                  <th className="px-3 py-3 font-medium">Sort</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Last Updated</th>
                  {canUpdate && <th className="px-3 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMasterData.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-surface-border/70 transition hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-4 font-medium text-gray-100">{item.label}</td>
                    <td className="px-3 py-4 font-mono text-xs text-gray-400">{item.code}</td>
                    <td className="px-3 py-4 text-gray-300">{item.sortOrder}</td>
                    <td className="px-3 py-4">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          item.isActive
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-400',
                        )}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs text-gray-500">
                      {formatUpdatedAt(item.updatedAt)}
                    </td>
                    {canUpdate && (
                      <td className="px-3 py-4">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:border-gold/40 hover:text-gold"
                          onClick={() => setEditMasterData(item)}
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
      )}

      <EditServiceRateModal
        open={Boolean(editRate)}
        rate={editRate}
        isSubmitting={updateRateMutation.isPending}
        onClose={() => setEditRate(null)}
        onSubmit={(defaultRate) => {
          if (editRate) {
            updateRateMutation.mutate({ id: editRate.id, defaultRate });
          }
        }}
      />

      <PackageFormModal
        open={packageFormOpen}
        mode={packageFormMode}
        pkg={editPackage}
        isSubmitting={createPackageMutation.isPending || updatePackageMutation.isPending}
        onClose={() => {
          setPackageFormOpen(false);
          setEditPackage(null);
        }}
        onSubmit={(payload) => {
          if (packageFormMode === 'create') {
            createPackageMutation.mutate(payload as Parameters<typeof settingsService.createPackage>[0]);
            return;
          }
          if (editPackage) {
            updatePackageMutation.mutate({ id: editPackage.id, payload });
          }
        }}
      />

      {masterDataCategory && (
        <>
          <AddMasterDataModal
            open={addMasterDataOpen}
            category={masterDataCategory}
            isSubmitting={createMasterDataMutation.isPending}
            onClose={() => setAddMasterDataOpen(false)}
            onSubmit={(values) => {
              createMasterDataMutation.mutate({
                category: masterDataCategory,
                code: values.code,
                label: values.label,
                sortOrder: values.sortOrder,
              });
            }}
          />

          <EditMasterDataModal
            open={Boolean(editMasterData)}
            item={editMasterData}
            isSubmitting={updateMasterDataMutation.isPending}
            onClose={() => setEditMasterData(null)}
            onSubmit={(values) => {
              if (editMasterData) {
                updateMasterDataMutation.mutate({ id: editMasterData.id, payload: values });
              }
            }}
          />
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Boxes,
  Building2,
  Camera,
  CreditCard,
  HardDrive,
  History,
  ListTree,
  Palette,
  Pencil,
  Plus,
  Search,
  Settings,
  Shield,
  Wallet,
} from 'lucide-react';
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
import { SettingsCountUp } from '@/components/settings/SettingsCountUp';
import { settingsBoxTone } from '@/components/settings/settings-visual';
import { cn } from '@/utils/cn';
import './settings/settings-page.css';

type SettingsTab =
  | 'studio-profile'
  | 'packages'
  | 'service-rates'
  | 'expense-categories'
  | 'equipment-categories'
  | 'payment-modes'
  | 'activity-log'
  | 'roles-permissions'
  | 'appearance'
  | 'backup-restore';

const TAB_CONFIG: {
  id: SettingsTab;
  label: string;
  category?: MasterDataCategory;
  icon: ComponentType;
}[] = [
  { id: 'studio-profile', label: 'Studio Profile', icon: Building2 },
  { id: 'packages', label: 'Packages', icon: Boxes },
  { id: 'service-rates', label: 'Service Rates', icon: Settings },
  { id: 'expense-categories', label: 'Expense Categories', category: 'expense_category', icon: Wallet },
  { id: 'equipment-categories', label: 'Equipment Categories', category: 'equipment_category', icon: Camera },
  { id: 'payment-modes', label: 'Payment Modes', category: 'payment_mode', icon: CreditCard },
  { id: 'activity-log', label: 'Activity Log', icon: History },
  { id: 'roles-permissions', label: 'Roles & Permissions', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'backup-restore', label: 'Backup & Restore', icon: HardDrive },
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

function SettingsHeroArt() {
  return (
    <svg viewBox="0 0 240 190" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="setHeroGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#c9a227" />
        </linearGradient>
      </defs>
      <rect x="48" y="58" width="72" height="52" rx="8" stroke="url(#setHeroGold)" strokeWidth="1.8" />
      <path d="M58 74h52M58 86h36" stroke="url(#setHeroGold)" strokeWidth="1.6" />
      <rect x="132" y="46" width="58" height="70" rx="8" stroke="url(#setHeroGold)" strokeOpacity="0.7" />
      <circle cx="161" cy="78" r="16" stroke="url(#setHeroGold)" strokeWidth="2.2" />
      <path
        d="M161 62 v6 M161 88 v6 M145 78 h6 M171 78 h6 M150 67 l4 4 M168 85 l4 4 M150 89 l4-4 M168 71 l4-4"
        stroke="url(#setHeroGold)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <rect x="88" y="122" width="86" height="22" rx="6" stroke="url(#setHeroGold)" strokeOpacity="0.55" />
    </svg>
  );
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
  const ActiveIcon = activeTab.icon;

  const packagesQuery = useQuery({
    queryKey: ['settings', 'packages', true],
    queryFn: () => settingsService.getPackages(true),
  });

  const companyQuery = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: settingsService.getCompanyProfile,
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
  });

  const masterDataQuery = useQuery({
    queryKey: ['settings', 'master-data', masterDataCategory, true],
    queryFn: () => settingsService.getMasterData(masterDataCategory!, true),
    enabled: Boolean(masterDataCategory),
  });

  const updateRateMutation = useMutation({
    mutationFn: ({
      id,
      defaultRate,
      isActive,
    }: {
      id: string;
      defaultRate: number;
      isActive: boolean;
    }) => settingsService.updateServiceRate(id, { defaultRate, isActive }),
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
      return item.label.toLowerCase().includes(term) || item.code.toLowerCase().includes(term);
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

  const isMasterDataTab =
    tab === 'expense-categories' || tab === 'payment-modes' || tab === 'equipment-categories';

  const selectTab = (id: SettingsTab) => {
    setTab(id);
    setSearch('');
    setAuditPage(1);
    setSearchParams(id === 'studio-profile' ? {} : { tab: id }, { replace: true });
  };

  const activePackages = (packagesQuery.data ?? []).filter((pkg) => pkg.isActive).length;

  return (
    <>
      <div className="dhara-set">
        <div className="dhara-set-ambient" aria-hidden>
          <span className="dhara-set-orb is-maroon" />
          <span className="dhara-set-orb is-gold" />
          <span className="dhara-set-orb is-cyan" />
          <span className="dhara-set-grid-bg" />
        </div>

        <section className="dhara-set-hero">
          <span className="dhara-set-lens" aria-hidden />
          <span className="dhara-set-particles" aria-hidden />
          <div>
            <p className="dhara-set-kicker">DHARA PHOTOGRAPHY ERP PRO</p>
            <h2>Settings & Configuration</h2>
            <p className="dhara-set-hero-copy">સેટિંગ્સ અને સ્ટુડિયો ગોઠવણી</p>
          </div>
          <div className="dhara-set-hero-art">
            <span className="dhara-set-hero-halo" aria-hidden />
            <span className="dhara-set-ring" aria-hidden />
            <SettingsHeroArt />
          </div>
        </section>

        {feedback && (
          <div className={cn('dhara-set-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
            {feedback.message}
          </div>
        )}

        <div className="dhara-set-kpis">
          <article className={cn('dhara-set-kpi is-text', settingsBoxTone(0))}>
            <div className="dhara-set-kpi-top">
              <div>
                <h3>Studio</h3>
                <p>Company profile</p>
              </div>
              <span className="dhara-set-icon">
                <Building2 />
              </span>
            </div>
            <strong>{companyQuery.data?.name ?? '—'}</strong>
          </article>
          <article className={cn('dhara-set-kpi', settingsBoxTone(1))}>
            <div className="dhara-set-kpi-top">
              <div>
                <h3>Packages</h3>
                <p>{activePackages} active</p>
              </div>
              <span className="dhara-set-icon">
                <Boxes />
              </span>
            </div>
            <strong>
              <SettingsCountUp value={packagesQuery.data?.length ?? 0} />
            </strong>
          </article>
          <article className={cn('dhara-set-kpi', settingsBoxTone(2))}>
            <div className="dhara-set-kpi-top">
              <div>
                <h3>Service Rates</h3>
                <p>Studio pricing</p>
              </div>
              <span className="dhara-set-icon">
                <Camera />
              </span>
            </div>
            <strong>
              <SettingsCountUp value={ratesQuery.data?.length ?? 0} />
            </strong>
          </article>
          <article className={cn('dhara-set-kpi', settingsBoxTone(3))}>
            <div className="dhara-set-kpi-top">
              <div>
                <h3>Sections</h3>
                <p>Configuration areas</p>
              </div>
              <span className="dhara-set-icon">
                <Settings />
              </span>
            </div>
            <strong>
              <SettingsCountUp value={visibleTabs.length} />
            </strong>
          </article>
        </div>

        <section className={cn('dhara-set-panel', settingsBoxTone(4))}>
          <p className="dhara-set-section-title">Configuration</p>
          <nav className="dhara-set-nav" aria-label="Settings sections">
            {visibleTabs.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn('dhara-set-nav-btn', settingsBoxTone(index), tab === item.id && 'is-on')}
                  onClick={() => selectTab(item.id)}
                >
                  <span className="dhara-set-icon">
                    <Icon />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </section>

        {tab === 'roles-permissions' ? (
          <RolesPermissionsPanel onFeedback={setFeedback} />
        ) : tab === 'appearance' ? (
          <AppearancePanel />
        ) : tab === 'backup-restore' ? (
          <BackupRestorePanel onFeedback={setFeedback} />
        ) : (
          <section className={cn('dhara-set-panel', settingsBoxTone(visibleTabs.findIndex((item) => item.id === tab) + 5))}>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="dhara-set-icon">
                  <ActiveIcon />
                </span>
                <div>
                  <h3 className="dhara-set-section-title" style={{ margin: 0 }}>
                    {activeTab.label}
                  </h3>
                  <p className="dhara-set-note" style={{ marginTop: '0.35rem' }}>
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
                <form
                  className="dhara-set-toolbar-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (tab === 'activity-log') setAuditPage(1);
                  }}
                >
                  <div className="dhara-set-input-wrap" style={{ flex: '1 1 14rem' }}>
                    <Search />
                    <input
                      className="dhara-set-input is-icon"
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
                      className="dhara-set-input"
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
                      className="dhara-set-btn is-gold"
                      onClick={() => {
                        setPackageFormMode('create');
                        setEditPackage(null);
                        setPackageFormOpen(true);
                      }}
                    >
                      <Plus />
                      Add Package
                    </button>
                  )}
                  {isMasterDataTab && canUpdate && (
                    <button type="button" className="dhara-set-btn is-gold" onClick={() => setAddMasterDataOpen(true)}>
                      <Plus />
                      Add Item
                    </button>
                  )}
                  {tab === 'activity-log' && (
                    <button
                      type="button"
                      className="dhara-set-btn"
                      onClick={() => {
                        setAuditPage(1);
                        void auditQuery.refetch();
                      }}
                    >
                      Search
                    </button>
                  )}
                </form>
              )}
            </div>

            {tab === 'studio-profile' ? (
              companyQuery.isLoading ? (
                <>
                  <p className="dhara-set-note">Loading studio profile...</p>
                  <div className="dhara-set-skeleton" style={{ minHeight: '12rem' }} />
                </>
              ) : companyQuery.isError ? (
                <div className="dhara-set-error">
                  <Building2 />
                  <p>{getApiErrorMessage(companyQuery.error, 'Failed to load studio profile.')}</p>
                  <button type="button" className="dhara-set-btn is-gold" onClick={() => void companyQuery.refetch()}>
                    Retry
                  </button>
                </div>
              ) : (
                <div className="dhara-set-form" style={{ maxWidth: '36rem' }}>
                  <div>
                    <label htmlFor="studio-name">Studio Name</label>
                    <input
                      id="studio-name"
                      className="dhara-set-input"
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      disabled={!canUpdate}
                    />
                  </div>
                  <div>
                    <label htmlFor="studio-code">Studio Code</label>
                    <input
                      id="studio-code"
                      className="dhara-set-input"
                      value={companyQuery.data?.code ?? ''}
                      disabled
                    />
                  </div>
                  {canUpdate && (
                    <button
                      type="button"
                      className="dhara-set-btn is-gold"
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
                <>
                  <p className="dhara-set-note">Loading packages...</p>
                  <div className="dhara-set-grid">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="dhara-set-skeleton" style={{ minHeight: '14rem' }} />
                    ))}
                  </div>
                </>
              ) : packagesQuery.isError ? (
                <div className="dhara-set-error">
                  <Boxes />
                  <p>{getApiErrorMessage(packagesQuery.error, 'Failed to load packages.')}</p>
                  <button type="button" className="dhara-set-btn is-gold" onClick={() => void packagesQuery.refetch()}>
                    Retry
                  </button>
                </div>
              ) : filteredPackages.length === 0 ? (
                <div className="dhara-set-empty">
                  <Boxes />
                  <h3>No packages match your search.</h3>
                  {canUpdate && (
                    <button
                      type="button"
                      className="dhara-set-btn is-gold"
                      onClick={() => {
                        setPackageFormMode('create');
                        setEditPackage(null);
                        setPackageFormOpen(true);
                      }}
                    >
                      <Plus />
                      Add Package
                    </button>
                  )}
                </div>
              ) : (
                <div className="dhara-set-grid">
                  {filteredPackages.map((pkg, index) => (
                    <article key={pkg.id} className={cn('dhara-set-gear', settingsBoxTone(index))}>
                      <div className="dhara-set-gear-top">
                        <span className="dhara-set-gear-art">
                          <Boxes />
                        </span>
                        <span className={cn('dhara-set-pill', pkg.isActive ? 'is-green' : 'is-amber')}>
                          {pkg.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div>
                        <h3>{pkg.label}</h3>
                        <p className="dhara-set-gear-meta">{pkg.code}</p>
                        {pkg.description && <p className="dhara-set-gear-meta">{pkg.description}</p>}
                        <p className="dhara-set-amt" style={{ marginTop: '0.55rem', fontSize: '1.45rem' }}>
                          {formatCurrency(pkg.defaultPrice)}
                        </p>
                        <p className="dhara-set-gear-meta">
                          Offer {pkg.offerPrice !== null ? formatCurrency(pkg.offerPrice) : '—'} · {pkg.items.length}{' '}
                          services
                        </p>
                        {pkg.items.length > 0 && (
                          <p className="dhara-set-gear-meta">
                            {pkg.items.map((item) => item.serviceName).join(', ')}
                          </p>
                        )}
                      </div>
                      {canUpdate && (
                        <div className="dhara-set-gear-actions">
                          <button
                            type="button"
                            className="dhara-set-btn"
                            onClick={() => {
                              setPackageFormMode('edit');
                              setEditPackage(pkg);
                              setPackageFormOpen(true);
                            }}
                          >
                            <Pencil />
                            Edit
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )
            ) : tab === 'activity-log' ? (
              auditQuery.isLoading ? (
                <>
                  <p className="dhara-set-note">Loading activity log...</p>
                  <div className="dhara-set-skeleton" style={{ minHeight: '12rem' }} />
                </>
              ) : auditQuery.isError ? (
                <div className="dhara-set-error">
                  <History />
                  <p>{getApiErrorMessage(auditQuery.error, 'Failed to load activity log.')}</p>
                  <button type="button" className="dhara-set-btn is-gold" onClick={() => void auditQuery.refetch()}>
                    Retry
                  </button>
                </div>
              ) : (auditQuery.data?.items.length ?? 0) === 0 ? (
                <div className="dhara-set-empty">
                  <History />
                  <h3>No activity found.</h3>
                </div>
              ) : (
                <>
                  <div className="dhara-set-table-wrap">
                    <table className="dhara-set-table">
                      <thead>
                        <tr>
                          <th>When</th>
                          <th>User</th>
                          <th>Module</th>
                          <th>Action</th>
                          <th>Record</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditQuery.data?.items.map((entry) => (
                          <tr key={entry.id}>
                            <td>{formatUpdatedAt(entry.createdAt)}</td>
                            <td>{entry.actorName ?? 'System'}</td>
                            <td className="capitalize">{entry.module}</td>
                            <td>{entry.action}</td>
                            <td>
                              {entry.recordType} · {entry.recordId.slice(0, 8)}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(auditQuery.data?.totalPages ?? 1) > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="dhara-set-note" style={{ margin: 0 }}>
                        Page {auditPage} of {auditQuery.data?.totalPages ?? 1}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="dhara-set-btn"
                          disabled={auditPage <= 1}
                          onClick={() => setAuditPage((current) => Math.max(1, current - 1))}
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          className="dhara-set-btn"
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
                </>
              )
            ) : tab === 'service-rates' ? (
              ratesQuery.isLoading ? (
                <>
                  <p className="dhara-set-note">Loading service rates...</p>
                  <div className="dhara-set-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="dhara-set-skeleton" style={{ minHeight: '14rem' }} />
                    ))}
                  </div>
                </>
              ) : ratesQuery.isError ? (
                <div className="dhara-set-error">
                  <Settings />
                  <p>{getApiErrorMessage(ratesQuery.error, 'Failed to load service rates.')}</p>
                  <button type="button" className="dhara-set-btn is-gold" onClick={() => void ratesQuery.refetch()}>
                    Retry
                  </button>
                </div>
              ) : filteredRates.length === 0 ? (
                <div className="dhara-set-empty">
                  <Settings />
                  <h3>No service rates match your search.</h3>
                </div>
              ) : (
                <div className="dhara-set-grid">
                  {filteredRates.map((rate, index) => (
                    <article
                      key={rate.id}
                      className={cn('dhara-set-gear', settingsBoxTone(index))}
                    >
                      <div className="dhara-set-gear-top">
                        <span className="dhara-set-gear-art">
                          {rate.category === 'album' ? <ListTree /> : <Camera />}
                        </span>
                        <span className={cn('dhara-set-pill', rate.isActive ? 'is-green' : 'is-amber')}>
                          {rate.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div>
                        <h3>{rate.name}</h3>
                        <p className="dhara-set-gear-meta">
                          {rate.code} · {rate.category} · {formatUnitLabel(rate.unit)}
                        </p>
                        <p className="dhara-set-amt" style={{ marginTop: '0.55rem', fontSize: '1.55rem' }}>
                          {formatCurrency(rate.defaultRate)}
                        </p>
                        <p className="dhara-set-gear-meta">Updated {formatUpdatedAt(rate.updatedAt)}</p>
                      </div>
                      {canUpdate && (
                        <div className="dhara-set-gear-actions">
                          <button type="button" className="dhara-set-btn" onClick={() => setEditRate(rate)}>
                            <Pencil />
                            Edit
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )
            ) : masterDataQuery.isLoading ? (
              <>
                <p className="dhara-set-note">Loading lookup items...</p>
                <div className="dhara-set-skeleton" style={{ minHeight: '12rem' }} />
              </>
            ) : masterDataQuery.isError ? (
              <div className="dhara-set-error">
                <ListTree />
                <p>{getApiErrorMessage(masterDataQuery.error, 'Failed to load lookup items.')}</p>
                <button type="button" className="dhara-set-btn is-gold" onClick={() => void masterDataQuery.refetch()}>
                  Retry
                </button>
              </div>
            ) : filteredMasterData.length === 0 ? (
              <div className="dhara-set-empty">
                <ListTree />
                <h3>No items match your search.</h3>
                {canUpdate && (
                  <button type="button" className="dhara-set-btn is-gold" onClick={() => setAddMasterDataOpen(true)}>
                    <Plus />
                    Add Item
                  </button>
                )}
              </div>
            ) : (
              <div className="dhara-set-grid">
                {filteredMasterData.map((item, index) => (
                  <article key={item.id} className={cn('dhara-set-gear', settingsBoxTone(index))}>
                    <div className="dhara-set-gear-top">
                      <span className="dhara-set-gear-art">
                        <ListTree />
                      </span>
                      <span className={cn('dhara-set-pill', item.isActive ? 'is-green' : 'is-amber')}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div>
                      <h3>{item.label}</h3>
                      <p className="dhara-set-gear-meta">{item.code}</p>
                      <p className="dhara-set-gear-meta">Sort {item.sortOrder}</p>
                      <p className="dhara-set-gear-meta">Updated {formatUpdatedAt(item.updatedAt)}</p>
                    </div>
                    {canUpdate && (
                      <div className="dhara-set-gear-actions">
                        <button type="button" className="dhara-set-btn" onClick={() => setEditMasterData(item)}>
                          <Pencil />
                          Edit
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <EditServiceRateModal
        open={Boolean(editRate)}
        rate={editRate}
        isSubmitting={updateRateMutation.isPending}
        onClose={() => setEditRate(null)}
        onSubmit={(values) => {
          if (editRate) {
            updateRateMutation.mutate({ id: editRate.id, ...values });
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
    </>
  );
}

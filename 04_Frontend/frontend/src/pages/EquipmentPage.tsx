import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Aperture,
  Archive,
  Camera,
  CheckCircle2,
  Eye,
  HardDrive,
  Lightbulb,
  Mic,
  Package,
  Pencil,
  Plane,
  Plus,
  Search,
  Tags,
  Users,
  Video,
  Wrench,
} from 'lucide-react';
import {
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_TRACKING_TYPES,
  EquipmentCategory,
  EquipmentDetail,
  EquipmentItem,
  CreateEquipmentPayload,
  UpdateEquipmentPayload,
  equipmentService,
} from '@/services/equipment-service';
import { bookingsService } from '@/services/bookings-service';
import { EquipmentCountUp } from '@/components/equipment/EquipmentCountUp';
import { EquipmentIssueModal } from '@/components/equipment/EquipmentIssueModal';
import {
  equipmentCategoryGlyph,
  equipmentCategoryTone,
  equipmentStatusTone,
  type EquipmentCategoryGlyph,
} from '@/components/equipment/equipment-visual';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';
import {
  formatEquipmentSpecifications,
  getEquipmentSpecFields,
  parseEquipmentSpecifications,
} from '@/utils/equipment-specifications';
import './equipment/equipment-page.css';

function EquipmentHeroArt() {
  return (
    <svg viewBox="0 0 240 200" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="eqHeroGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#c9a227" />
        </linearGradient>
        <linearGradient id="eqHeroCyan" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx="128" cy="102" r="82" stroke="url(#eqHeroGold)" strokeOpacity="0.22" />
      <circle cx="128" cy="102" r="62" stroke="url(#eqHeroGold)" strokeOpacity="0.45" strokeWidth="1.5" />
      <circle cx="128" cy="102" r="38" stroke="url(#eqHeroCyan)" strokeOpacity="0.55" strokeWidth="2" />
      <circle cx="128" cy="102" r="14" fill="rgba(255,212,90,0.18)" stroke="url(#eqHeroGold)" strokeWidth="2.2" />
      <rect x="46" y="78" width="72" height="52" rx="8" stroke="url(#eqHeroGold)" strokeWidth="2.2" />
      <path d="M58 78 L68 62 H92 L102 78" stroke="url(#eqHeroGold)" strokeWidth="2" />
      <circle cx="82" cy="104" r="12" stroke="url(#eqHeroCyan)" strokeWidth="1.8" />
      <path d="M176 58 L188 78 L208 86" stroke="rgba(255,241,201,0.45)" strokeWidth="1.6" />
      <path d="M188 148 L206 132" stroke="rgba(34,211,238,0.4)" strokeWidth="1.5" />
    </svg>
  );
}

function CategoryIcon({ kind }: { kind: EquipmentCategoryGlyph }) {
  switch (kind) {
    case 'camera':
      return <Camera />;
    case 'lens':
      return <Aperture />;
    case 'memory':
      return <HardDrive />;
    case 'drone':
      return <Plane />;
    case 'light':
      return <Lightbulb />;
    case 'audio':
      return <Mic />;
    case 'tripod':
      return <Video />;
    default:
      return <Package />;
  }
}

export function EquipmentPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canWrite = hasPermission('equipment.write');
  const canIssue = hasPermission('equipment.issue');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<EquipmentItem | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueBookingId, setIssueBookingId] = useState<string | null>(null);
  const [archiveItem, setArchiveItem] = useState<EquipmentItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['equipment', 'list', page, search, category],
    queryFn: () =>
      equipmentService.list({
        page,
        limit: 20,
        search: search || undefined,
        category: category || undefined,
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['equipment', 'categories', true],
    queryFn: () => equipmentService.listCategories(true),
  });

  const dashboardQuery = useQuery({
    queryKey: ['equipment', 'dashboard'],
    queryFn: () => equipmentService.getDashboard(),
  });

  const detailQuery = useQuery({
    queryKey: ['equipment', 'detail', detailId],
    queryFn: () => equipmentService.getById(detailId!),
    enabled: Boolean(detailId),
  });

  const invalidateEquipment = () => {
    queryClient.invalidateQueries({ queryKey: ['equipment'] });
  };

  const createMutation = useMutation({
    mutationFn: equipmentService.create,
    onSuccess: () => {
      invalidateEquipment();
      setFormOpen(false);
      setFeedback('Equipment added to inventory.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEquipmentPayload }) =>
      equipmentService.update(id, payload),
    onSuccess: () => {
      invalidateEquipment();
      setEditItem(null);
      setFeedback('Equipment updated.');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => equipmentService.archive(id),
    onSuccess: () => {
      invalidateEquipment();
      setArchiveItem(null);
      setFeedback('Equipment archived.');
    },
  });

  const items = listQuery.data?.items ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;
  const categories = categoriesQuery.data ?? [];
  const activeCategories = categories.filter((item) => item.isActive);
  const mutationError = createMutation.error ?? updateMutation.error ?? archiveMutation.error;
  const hasFilters = Boolean(search || category);
  const dashboard = dashboardQuery.data;
  const applySearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <>
    <div className="dhara-eq">
      <div className="dhara-eq-ambient" aria-hidden>
        <span className="dhara-eq-orb is-maroon" />
        <span className="dhara-eq-orb is-gold" />
        <span className="dhara-eq-orb is-cyan" />
      </div>

      <section className="dhara-eq-hero">
        <span className="dhara-eq-lens" aria-hidden />
        <span className="dhara-eq-particles" aria-hidden />
        <div>
          <p className="dhara-eq-kicker">Dhara Photography ERP Pro</p>
          <h2>Equipment Management</h2>
          <p className="dhara-eq-hero-copy">ઇક્વિપમેન્ટ — ઇન્વેન્ટરી, ઉપલબ્ધતા અને શૂટ ઇશ્યૂ</p>
          <div className="dhara-eq-hero-actions">
            {canWrite && (
              <>
                <button type="button" className="dhara-eq-btn is-gold" onClick={() => setFormOpen(true)}>
                  <Plus />
                  Add Equipment
                </button>
                <button type="button" className="dhara-eq-btn" onClick={() => setManageOpen(true)}>
                  <Tags />
                  Manage Categories
                </button>
                <Link to="/settings?tab=equipment-categories" className="dhara-eq-btn">
                  Open in Settings
                </Link>
              </>
            )}
            {canIssue && (
              <button type="button" className="dhara-eq-btn is-cyan" onClick={() => setIssueOpen(true)}>
                <Camera />
                Issue to booking
              </button>
            )}
          </div>
        </div>
        <div className="dhara-eq-hero-art">
          <span className="dhara-eq-hero-halo" aria-hidden />
          <EquipmentHeroArt />
        </div>
      </section>

      {feedback && <div className="dhara-eq-flash is-ok">{feedback}</div>}
      {mutationError && (
        <div className="dhara-eq-flash is-bad">
          {getApiErrorMessage(mutationError, 'Failed to save equipment.')}
        </div>
      )}

      <div className="dhara-eq-kpis">
        <article className="dhara-eq-kpi is-green">
          <div className="dhara-eq-kpi-top">
            <div>
              <h3>Available</h3>
              <p>Ready for issue</p>
            </div>
            <span className="dhara-eq-icon">
              <CheckCircle2 />
            </span>
          </div>
          <strong>
            <EquipmentCountUp value={dashboard?.available ?? 0} />
          </strong>
        </article>
        <article className="dhara-eq-kpi is-cyan">
          <div className="dhara-eq-kpi-top">
            <div>
              <h3>On Shoot</h3>
              <p>Currently assigned</p>
            </div>
            <span className="dhara-eq-icon">
              <Camera />
            </span>
          </div>
          <strong>
            <EquipmentCountUp value={dashboard?.onShoot ?? 0} />
          </strong>
        </article>
        <article className="dhara-eq-kpi is-gold">
          <div className="dhara-eq-kpi-top">
            <div>
              <h3>With Staff</h3>
              <p>Open issue holdings</p>
            </div>
            <span className="dhara-eq-icon">
              <Users />
            </span>
          </div>
          <strong>
            <EquipmentCountUp value={dashboard?.withStaff ?? 0} />
          </strong>
        </article>
        <article className="dhara-eq-kpi is-amber">
          <div className="dhara-eq-kpi-top">
            <div>
              <h3>Under Repair</h3>
              <p>Needs attention</p>
            </div>
            <span className="dhara-eq-icon">
              <Wrench />
            </span>
          </div>
          <strong>
            <EquipmentCountUp value={dashboard?.underRepair ?? 0} />
          </strong>
        </article>
        <article className="dhara-eq-kpi is-rose">
          <div className="dhara-eq-kpi-top">
            <div>
              <h3>Missing</h3>
              <p>Not returned</p>
            </div>
            <span className="dhara-eq-icon is-rose">
              <Archive />
            </span>
          </div>
          <strong>
            <EquipmentCountUp value={dashboard?.missing ?? 0} />
          </strong>
        </article>
        <article className="dhara-eq-kpi is-purple">
          <div className="dhara-eq-kpi-top">
            <div>
              <h3>Categories</h3>
              <p>Master data</p>
            </div>
            <span className="dhara-eq-icon">
              <Tags />
            </span>
          </div>
          <strong>
            <EquipmentCountUp value={categories.length} />
          </strong>
        </article>
      </div>

      {categories.length > 0 && (
        <section className="dhara-eq-panel">
          <p className="dhara-eq-section-title">Categories</p>
          <div className="dhara-eq-cats">
            <button
              type="button"
              className={cn('dhara-eq-cat-tile', !category && 'is-on')}
              onClick={() => {
                setCategory('');
                setPage(1);
              }}
            >
              <span className="dhara-eq-icon">
                <Package />
              </span>
              <span>
                <strong>All categories</strong>
                <em>{listQuery.data?.total ?? items.length} in this list</em>
              </span>
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'dhara-eq-cat-tile',
                  equipmentCategoryTone(item.code || item.label),
                  category === item.code && 'is-on',
                )}
                onClick={() => {
                  setCategory(item.code);
                  setPage(1);
                }}
              >
                <span className="dhara-eq-icon">
                  <CategoryIcon kind={equipmentCategoryGlyph(item.code || item.label)} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <em>
                    {item.code}
                    {item.isActive ? '' : ' · inactive'}
                  </em>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="dhara-eq-panel">
        <div className="dhara-eq-toolbar-row">
          <div className="dhara-eq-input-wrap" style={{ flex: '1 1 18rem' }}>
            <Search />
            <input
              className="dhara-eq-input is-icon"
              placeholder="Search name, code, or serial"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            />
          </div>
          <div className="dhara-eq-field">
            <label htmlFor="equipment-category-filter">Filter by category</label>
            <select
              id="equipment-category-filter"
              aria-label="Category filter"
              className="dhara-eq-input"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.code}>
                  {item.label}
                  {item.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="dhara-eq-btn is-gold" onClick={applySearch}>
            Search
          </button>
        </div>
      </section>

      {listQuery.isLoading ? (
        <>
          <p className="dhara-eq-note">Loading equipment...</p>
          <div className="dhara-eq-kpis">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="dhara-eq-skeleton" style={{ minHeight: '10rem' }} />
            ))}
          </div>
        </>
      ) : listQuery.isError ? (
        <div className="dhara-eq-error">
          <Camera />
          <p>{getApiErrorMessage(listQuery.error, 'Failed to load equipment. Please try again.')}</p>
          <button type="button" className="dhara-eq-btn is-gold" onClick={() => void listQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="dhara-eq-empty">
          <Camera />
          <h3>{hasFilters ? 'No equipment matches your search.' : 'No equipment in inventory yet.'}</h3>
          <p>
            {hasFilters
              ? 'Try a different name, code, serial, or category.'
              : 'Add your first camera, lens, or accessory to start tracking inventory.'}
          </p>
          {canWrite && !hasFilters && (
            <button type="button" className="dhara-eq-btn is-gold" onClick={() => setFormOpen(true)}>
              <Plus />
              Add Equipment
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="dhara-eq-grid">
            {items.map((item) => {
              const tone = equipmentCategoryTone(item.category);
              return (
                <article key={item.id} className={cn('dhara-eq-gear', tone)}>
                  <div className="dhara-eq-gear-top">
                    <span className={cn('dhara-eq-gear-art', tone)}>
                      <CategoryIcon kind={equipmentCategoryGlyph(item.category)} />
                    </span>
                    <span className={cn('dhara-eq-pill', equipmentStatusTone(item.status))}>{item.status}</span>
                  </div>
                  <div>
                    <h3>{item.name}</h3>
                    <p className="dhara-eq-gear-meta">
                      {item.code}
                      {item.serialNumber ? ` · ${item.serialNumber}` : ''}
                    </p>
                    <p className="dhara-eq-gear-meta">
                      {item.category} · {item.trackingType}
                      {item.condition ? ` · ${item.condition}` : ''}
                    </p>
                  </div>
                  <div className="dhara-eq-qty">
                    <p>
                      <span>Available</span>
                      <strong>{item.availableQuantity}</strong>
                    </p>
                    <p>
                      <span>On Shoot</span>
                      <strong>{item.onShootQuantity}</strong>
                    </p>
                    <p>
                      <span>Missing</span>
                      <strong>{item.missingQuantity}</strong>
                    </p>
                    <p>
                      <span>Under Repair</span>
                      <strong>{item.underRepairQuantity}</strong>
                    </p>
                  </div>
                  <div className="dhara-eq-gear-actions">
                    <button type="button" className="dhara-eq-btn" onClick={() => setDetailId(item.id)}>
                      <Eye />
                      History
                    </button>
                    {canWrite && (
                      <button type="button" className="dhara-eq-btn" onClick={() => setEditItem(item)}>
                        <Pencil />
                        Edit
                      </button>
                    )}
                    {canWrite && (
                      <button type="button" className="dhara-eq-btn" onClick={() => setArchiveItem(item)}>
                        <Archive />
                        Archive
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-between">
              <p className="dhara-eq-note" style={{ margin: 0 }}>
                Page {page} of {totalPages} · {listQuery.data?.total ?? 0} items
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="dhara-eq-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="dhara-eq-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>

      {formOpen && (
        <EquipmentFormDialog
          title="Add Equipment"
          categories={activeCategories}
          onClose={() => setFormOpen(false)}
          onSubmit={(payload) => createMutation.mutate(payload as CreateEquipmentPayload)}
          pending={createMutation.isPending}
        />
      )}

      {editItem && (
        <EquipmentFormDialog
          title="Edit Equipment"
          item={editItem}
          categories={mergeCurrentCategory(activeCategories, categories, editItem.category)}
          onClose={() => setEditItem(null)}
          onSubmit={(payload) => updateMutation.mutate({ id: editItem.id, payload })}
          pending={updateMutation.isPending}
        />
      )}

      {manageOpen && (
        <ManageCategoriesDialog
          categories={categories}
          onClose={() => setManageOpen(false)}
          onChanged={invalidateEquipment}
        />
      )}

      {detailId && (
        <EquipmentHistoryDialog
          equipment={detailQuery.data ?? null}
          loading={detailQuery.isLoading}
          onClose={() => setDetailId(null)}
        />
      )}

      {issueOpen && !issueBookingId && (
        <IssueBookingPicker
          onClose={() => setIssueOpen(false)}
          onSelect={(bookingId) => setIssueBookingId(bookingId)}
        />
      )}

      <EquipmentIssueModal
        open={Boolean(issueBookingId)}
        bookingId={issueBookingId ?? ''}
        onClose={() => {
          setIssueBookingId(null);
          setIssueOpen(false);
        }}
        onIssued={() => {
          invalidateEquipment();
          setIssueBookingId(null);
          setIssueOpen(false);
          setFeedback('Equipment issued to booking.');
        }}
      />

      {archiveItem && (
        <div className="dhara-eq-modal">
          <div className="dhara-eq-modal-card">
            <h2>Archive equipment</h2>
            <p className="dhara-eq-modal-sub">
              Archive {archiveItem.name}? It will leave the active inventory list. Items currently on
              shoot cannot be archived.
            </p>
            {archiveMutation.error && (
              <p className="dhara-eq-err">
                {getApiErrorMessage(archiveMutation.error, 'Failed to archive equipment.')}
              </p>
            )}
            <div className="dhara-eq-form-actions">
              <button type="button" className="dhara-eq-btn" onClick={() => setArchiveItem(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="dhara-eq-btn is-gold"
                disabled={archiveMutation.isPending}
                onClick={() => archiveMutation.mutate(archiveItem.id)}
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function IssueBookingPicker({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (bookingId: string) => void;
}) {
  const [bookingSearch, setBookingSearch] = useState('');
  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'equipment-issue', bookingSearch],
    queryFn: () => bookingsService.list({ page: 1, limit: 20, search: bookingSearch || undefined }),
  });
  const bookings = bookingsQuery.data?.items ?? [];

  return (
    <div className="dhara-eq-modal">
      <div className="dhara-eq-modal-card">
        <h2>Select booking</h2>
        <p className="dhara-eq-modal-sub">Equipment can only be issued against an existing booking.</p>
        <input
          className="dhara-eq-input mt-4"
          placeholder="Search booking number or client"
          value={bookingSearch}
          onChange={(e) => setBookingSearch(e.target.value)}
        />
        {bookingsQuery.isLoading && <p className="dhara-eq-note">Loading bookings...</p>}
        {bookingsQuery.isError && (
          <p className="dhara-eq-err">{getApiErrorMessage(bookingsQuery.error, 'Failed to load bookings.')}</p>
        )}
        <ul className="mt-4 space-y-2">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <button type="button" className="dhara-eq-booking-pick" onClick={() => onSelect(booking.id)}>
                <p>{booking.bookingNumber}</p>
                <span>
                  {booking.client.fullName} · {booking.eventType}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!bookingsQuery.isLoading && bookings.length === 0 && (
          <p className="dhara-eq-note">No bookings found.</p>
        )}
        <div className="dhara-eq-form-actions">
          <button type="button" className="dhara-eq-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function mergeCurrentCategory(
  active: EquipmentCategory[],
  all: EquipmentCategory[],
  currentLabel: string,
) {
  if (active.some((item) => item.label === currentLabel || item.code === currentLabel)) {
    return active;
  }
  const current = all.find((item) => item.label === currentLabel || item.code === currentLabel);
  return current ? [current, ...active] : active;
}

function EquipmentFormDialog({
  title,
  item,
  categories,
  onClose,
  onSubmit,
  pending,
}: {
  title: string;
  item?: EquipmentItem | null;
  categories: EquipmentCategory[];
  onClose: () => void;
  onSubmit: (payload: CreateEquipmentPayload | UpdateEquipmentPayload) => void;
  pending: boolean;
}) {
  const defaultCategory = useMemo(() => {
    if (!item) return categories[0]?.code ?? '';
    const match = categories.find((row) => row.label === item.category || row.code === item.category);
    return match?.code ?? categories[0]?.code ?? '';
  }, [categories, item]);

  const [form, setForm] = useState({
    code: item?.code ?? '',
    name: item?.name ?? '',
    category: defaultCategory,
    trackingType: item?.trackingType ?? 'bulk',
    serialNumber: item?.serialNumber ?? '',
    totalQuantity: item?.totalQuantity ?? 1,
    condition: item?.condition ?? 'GOOD',
    notes: item?.notes ?? '',
  });

  const isEdit = Boolean(item);
  const selectedCategory = categories.find((row) => row.code === form.category);
  const specFields = getEquipmentSpecFields(form.category, selectedCategory?.label, item?.category);
  const [specs, setSpecs] = useState<Record<string, string>>(() => {
    const existing = parseEquipmentSpecifications(item?.specifications ?? null) ?? {};
    return Object.fromEntries(Object.entries(existing).map(([key, value]) => [key, String(value)]));
  });
  const [specError, setSpecError] = useState<string | null>(null);

  const buildSpecifications = (): Record<string, string | number> | null => {
    const payload: Record<string, string | number> = {};
    for (const field of specFields) {
      const raw = specs[field.key]?.trim();
      if (!raw) continue;
      if (field.type === 'number') {
        const numeric = Number(raw);
        if (!Number.isFinite(numeric) || numeric <= 0) {
          throw new Error(`${field.label} must be a positive number.`);
        }
        payload[field.key] = numeric;
        continue;
      }
      payload[field.key] = raw;
    }
    return Object.keys(payload).length ? payload : null;
  };

  return (
    <div className="dhara-eq-modal">
      <form
        className="dhara-eq-modal-card dhara-eq-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const specifications = buildSpecifications();
            setSpecError(null);
            onSubmit({
              code: form.code,
              name: form.name,
              category: form.category,
              ...(isEdit ? {} : { trackingType: form.trackingType }),
              serialNumber:
                form.trackingType === 'serialized' || item?.trackingType === 'serialized'
                  ? form.serialNumber
                  : undefined,
              totalQuantity:
                (item?.trackingType ?? form.trackingType) === 'serialized' ? 1 : Number(form.totalQuantity || 1),
              condition: form.condition,
              notes: form.notes || undefined,
              specifications,
            });
          } catch (error) {
            setSpecError(error instanceof Error ? error.message : 'Invalid specifications.');
          }
        }}
      >
        <h2>{title}</h2>
        <input
          className="dhara-eq-input"
          placeholder="Code (CAM-001)"
          required
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <input
          className="dhara-eq-input"
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          aria-label="Category"
          className="dhara-eq-input"
          required
          value={form.category}
          onChange={(e) => {
            setForm({ ...form, category: e.target.value });
            setSpecs({});
          }}
        >
          <option value="" disabled>
            Select category
          </option>
          {categories.map((row) => (
            <option key={row.id} value={row.code}>
              {row.label}
              {row.isActive ? '' : ' (inactive)'}
            </option>
          ))}
        </select>
        {isEdit ? (
          <p className="dhara-eq-note" style={{ margin: 0 }}>
            Tracking type: {item?.trackingType}
          </p>
        ) : (
          <select
            aria-label="Tracking type"
            className="dhara-eq-input"
            value={form.trackingType}
            onChange={(e) => setForm({ ...form, trackingType: e.target.value })}
          >
            {EQUIPMENT_TRACKING_TYPES.map((row) => (
              <option key={row} value={row}>
                {row}
              </option>
            ))}
          </select>
        )}
        {(item?.trackingType ?? form.trackingType) === 'serialized' ? (
          <input
            className="dhara-eq-input"
            placeholder="Serial / item ID"
            required
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
          />
        ) : (
          <input
            className="dhara-eq-input"
            type="number"
            min={1}
            aria-label="Total quantity"
            value={form.totalQuantity}
            onChange={(e) => setForm({ ...form, totalQuantity: Number(e.target.value) })}
          />
        )}
        <select
          aria-label="Condition"
          className="dhara-eq-input"
          value={form.condition}
          onChange={(e) => setForm({ ...form, condition: e.target.value })}
        >
          {EQUIPMENT_CONDITIONS.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </select>
        <textarea
          className="dhara-eq-input"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div className="dhara-eq-fact" style={{ padding: '1rem' }}>
          <p className="dhara-eq-section-title" style={{ marginBottom: '0.7rem' }}>
            Specifications
          </p>
          <div className="space-y-2">
            {specFields.map((field) => (
              <label key={field.key} className="block">
                {field.label}
                {field.type === 'select' ? (
                  <select
                    aria-label={field.label}
                    className="dhara-eq-input mt-1"
                    value={specs[field.key] ?? ''}
                    onChange={(e) => setSpecs({ ...specs, [field.key]: e.target.value })}
                  >
                    <option value="">Select</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    aria-label={field.label}
                    className="dhara-eq-input mt-1"
                    type={field.type === 'number' ? 'number' : 'text'}
                    min={field.type === 'number' ? 1 : undefined}
                    value={specs[field.key] ?? ''}
                    onChange={(e) => setSpecs({ ...specs, [field.key]: e.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
          {specError && <p className="dhara-eq-err">{specError}</p>}
        </div>
        <div className="dhara-eq-form-actions">
          <button type="button" className="dhara-eq-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="dhara-eq-btn is-gold" disabled={pending || !form.category}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function ManageCategoriesDialog({
  categories,
  onClose,
  onChanged,
}: {
  categories: EquipmentCategory[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [label, setLabel] = useState('');
  const [editing, setEditing] = useState<EquipmentCategory | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => equipmentService.createCategory({ label }),
    onSuccess: () => {
      setLabel('');
      setError(null);
      onChanged();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not create category.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { label?: string; isActive?: boolean } }) =>
      equipmentService.updateCategory(id, payload),
    onSuccess: () => {
      setEditing(null);
      setError(null);
      onChanged();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not update category.')),
  });

  return (
    <div className="dhara-eq-modal">
      <div className="dhara-eq-modal-card is-wide">
        <h2>Manage Categories</h2>
        <p className="dhara-eq-modal-sub">Deactivating keeps historical equipment; it is hidden from new items.</p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (label.trim()) createMutation.mutate();
          }}
        >
          <input
            className="dhara-eq-input flex-1"
            placeholder="New category name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button type="submit" className="dhara-eq-btn is-gold" disabled={createMutation.isPending}>
            Add
          </button>
        </form>
        {error && <p className="dhara-eq-err">{error}</p>}
        <ul className="mt-4 space-y-2">
          {categories.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-gold/20 px-3 py-2">
              {editing?.id === item.id ? (
                <input className="dhara-eq-input flex-1" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
              ) : (
                <div>
                  <p className="text-base font-semibold text-gray-100">{item.label}</p>
                  <p className="dhara-eq-note" style={{ margin: 0 }}>
                    {item.code} · {item.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                {editing?.id === item.id ? (
                  <button
                    type="button"
                    className="dhara-eq-btn is-gold"
                    onClick={() => updateMutation.mutate({ id: item.id, payload: { label: editLabel } })}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    type="button"
                    className="dhara-eq-btn"
                    onClick={() => {
                      setEditing(item);
                      setEditLabel(item.label);
                    }}
                  >
                    Rename
                  </button>
                )}
                <button
                  type="button"
                  className="dhara-eq-btn"
                  onClick={() => updateMutation.mutate({ id: item.id, payload: { isActive: !item.isActive } })}
                >
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="dhara-eq-form-actions">
          <button type="button" className="dhara-eq-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EquipmentHistoryDialog({
  equipment,
  loading,
  onClose,
}: {
  equipment: EquipmentDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="dhara-eq-modal">
      <div className="dhara-eq-modal-card is-wide">
        <h2>{equipment ? `${equipment.name} · ${equipment.code}` : 'Equipment history'}</h2>
        {loading || !equipment ? (
          <p className="dhara-eq-note">Loading history…</p>
        ) : (
          <>
            <div className="dhara-eq-facts mt-4">
              <div className="dhara-eq-fact">
                <span>Equipment</span>
                <strong>{equipment.name}</strong>
              </div>
              <div className="dhara-eq-fact">
                <span>Code</span>
                <strong>{equipment.code}</strong>
              </div>
              <div className="dhara-eq-fact">
                <span>Category</span>
                <strong>{equipment.category}</strong>
              </div>
              <div className="dhara-eq-fact">
                <span>Tracking Type</span>
                <strong className="capitalize">{equipment.trackingType}</strong>
              </div>
              <div className="dhara-eq-fact">
                <span>Serial / Item ID</span>
                <strong>{equipment.serialNumber || '—'}</strong>
              </div>
              <div className="dhara-eq-fact">
                <span>Condition</span>
                <strong>{equipment.condition}</strong>
              </div>
              <div className="dhara-eq-fact">
                <span>Status</span>
                <strong>{equipment.status}</strong>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="dhara-eq-section-title">Specifications</h3>
              {formatEquipmentSpecifications(equipment.specifications, equipment.category).length === 0 ? (
                <p className="dhara-eq-note">No specifications recorded.</p>
              ) : (
                <div className="dhara-eq-facts mt-2">
                  {formatEquipmentSpecifications(equipment.specifications, equipment.category).map((row) => (
                    <div key={row.key} className="dhara-eq-fact">
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {equipment.notes ? (
              <div className="mt-4">
                <h3 className="dhara-eq-section-title">Notes</h3>
                <p className="dhara-eq-note">{equipment.notes}</p>
              </div>
            ) : null}
            <ul className="mt-4 space-y-3">
              {equipment.history.length === 0 && (
                <p className="dhara-eq-note">No issue / return history yet.</p>
              )}
              {equipment.history.map((row) => (
                <li key={row.id} className="dhara-eq-fact">
                  <p className="text-base font-semibold text-gray-100">
                    {formatDate(row.occurredAt)} · {row.action}
                  </p>
                  <p className="dhara-eq-note" style={{ marginTop: '0.35rem' }}>
                    {row.bookingNumber ? `Booking: ${row.bookingNumber}` : ''}
                    {row.staffName ? ` · Staff: ${row.staffName}` : ''}
                    {row.conditionOut ? ` · Condition Out: ${row.conditionOut}` : ''}
                    {row.conditionIn ? ` · Condition In: ${row.conditionIn}` : ''}
                  </p>
                  {row.notes && <p className="mt-1 text-gray-300">{row.notes}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="dhara-eq-form-actions">
          <button type="button" className="dhara-eq-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

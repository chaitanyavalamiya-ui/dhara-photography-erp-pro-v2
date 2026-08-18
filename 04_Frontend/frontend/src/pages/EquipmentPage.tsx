import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Camera, Eye, Pencil, Plus, Search, Tags } from 'lucide-react';
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
import { EquipmentIssueModal } from '@/components/equipment/EquipmentIssueModal';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';
import {
  formatEquipmentSpecifications,
  getEquipmentSpecFields,
  parseEquipmentSpecifications,
} from '@/utils/equipment-specifications';

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gold">Equipment / Inventory</h1>
          <p className="text-sm text-gray-400">Asset register, availability, and issue history</p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setManageOpen(true)}>
              <Tags className="mr-2 inline h-4 w-4" />
              Manage Categories
            </button>
            <Link to="/settings?tab=equipment-categories" className="btn-secondary inline-flex items-center">
              Open in Settings
            </Link>
            <button type="button" className="btn-primary" onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 inline h-4 w-4" />
              Add Equipment
            </button>
          </div>
        )}
      </div>
      {canIssue && (
        <div className="flex justify-end">
          <button type="button" className="btn-secondary" onClick={() => setIssueOpen(true)}>
            <Camera className="mr-2 inline h-4 w-4" />
            Issue to booking
          </button>
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            className="input-field pl-9"
            placeholder="Search name, code, or serial"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), setSearch(searchInput))}
          />
        </div>
        <select
          aria-label="Category filter"
          className="input-field w-48"
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
        <button type="button" className="btn-secondary" onClick={() => (setPage(1), setSearch(searchInput))}>
          Search
        </button>
      </div>

      {feedback && <p className="text-sm text-green-400">{feedback}</p>}
      {mutationError && (
        <p className="text-sm text-red-400">{getApiErrorMessage(mutationError, 'Failed to save equipment.')}</p>
      )}

      <div className="card overflow-x-auto">
        {listQuery.isLoading ? (
          <p className="py-12 text-center text-sm text-gray-400">Loading equipment...</p>
        ) : listQuery.isError ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-red-400">
              {getApiErrorMessage(listQuery.error, 'Failed to load equipment. Please try again.')}
            </p>
            <button type="button" className="btn-secondary mt-4" onClick={() => void listQuery.refetch()}>
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h3 className="font-display text-lg font-semibold text-gray-200">
              {hasFilters ? 'No equipment matches your search.' : 'No equipment in inventory yet.'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {hasFilters
                ? 'Try a different name, code, serial, or category.'
                : 'Add your first camera, lens, or accessory to start tracking inventory.'}
            </p>
          </div>
        ) : (
          <>
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-3">Equipment</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Tracking</th>
                  <th className="px-3 py-3">Available</th>
                  <th className="px-3 py-3">On Shoot</th>
                  <th className="px-3 py-3">Missing</th>
                  <th className="px-3 py-3">Under Repair</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-surface-border/60">
                    <td className="px-3 py-3">
                      <p className="text-gray-100">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.code}
                        {item.serialNumber ? ` · ${item.serialNumber}` : ''}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-gray-300">{item.category}</td>
                    <td className="px-3 py-3 capitalize text-gray-300">{item.trackingType}</td>
                    <td className="px-3 py-3">{item.availableQuantity}</td>
                    <td className="px-3 py-3">{item.onShootQuantity}</td>
                    <td className="px-3 py-3">{item.missingQuantity}</td>
                    <td className="px-3 py-3">{item.underRepairQuantity}</td>
                    <td className="px-3 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs', statusClass(item.status))}>{item.status}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => setDetailId(item.id)}>
                          <Eye className="mr-1 inline h-3.5 w-3.5" />
                          History
                        </button>
                        {canWrite && (
                          <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => setEditItem(item)}>
                            <Pencil className="mr-1 inline h-3.5 w-3.5" />
                            Edit
                          </button>
                        )}
                        {canWrite && (
                          <button
                            type="button"
                            className="btn-secondary px-3 py-1 text-xs"
                            onClick={() => setArchiveItem(item)}
                          >
                            <Archive className="mr-1 inline h-3.5 w-3.5" />
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between px-3 pb-3 text-sm text-gray-400">
                <p>
                  Page {page} of {totalPages} · {listQuery.data?.total ?? 0} items
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-md">
            <h2 className="font-display text-xl font-semibold text-gold">Archive equipment</h2>
            <p className="mt-2 text-sm text-gray-400">
              Archive {archiveItem.name}? It will leave the active inventory list. Items currently on shoot cannot be archived.
            </p>
            {archiveMutation.error && (
              <p className="mt-3 text-sm text-red-400">
                {getApiErrorMessage(archiveMutation.error, 'Failed to archive equipment.')}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setArchiveItem(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={archiveMutation.isPending}
                onClick={() => archiveMutation.mutate(archiveItem.id)}
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card max-h-[92vh] w-full max-w-lg overflow-y-auto">
        <h2 className="font-display text-xl font-semibold text-gold">Select booking</h2>
        <p className="mt-1 text-sm text-gray-400">Equipment can only be issued against an existing booking.</p>
        <input
          className="input-field mt-4"
          placeholder="Search booking number or client"
          value={bookingSearch}
          onChange={(e) => setBookingSearch(e.target.value)}
        />
        {bookingsQuery.isLoading && <p className="mt-4 text-sm text-gray-400">Loading bookings...</p>}
        {bookingsQuery.isError && (
          <p className="mt-4 text-sm text-red-400">
            {getApiErrorMessage(bookingsQuery.error, 'Failed to load bookings.')}
          </p>
        )}
        <ul className="mt-4 space-y-2">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <button
                type="button"
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-left text-sm hover:border-gold/40"
                onClick={() => onSelect(booking.id)}
              >
                <p className="text-gray-100">{booking.bookingNumber}</p>
                <p className="text-xs text-gray-500">
                  {booking.client.fullName} · {booking.eventType}
                </p>
              </button>
            </li>
          ))}
        </ul>
        {!bookingsQuery.isLoading && bookings.length === 0 && (
          <p className="mt-4 text-sm text-gray-400">No bookings found.</p>
        )}
        <div className="mt-5 flex justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
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

function statusClass(status: string) {
  if (status === 'AVAILABLE') return 'bg-green-500/15 text-green-400';
  if (status === 'ON_SHOOT') return 'bg-amber-500/15 text-amber-400';
  if (status === 'MISSING') return 'bg-orange-500/15 text-orange-400';
  if (status === 'UNDER_REPAIR') return 'bg-red-500/15 text-red-400';
  return 'bg-gray-500/15 text-gray-400';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        className="card max-h-[92vh] w-full max-w-lg space-y-3 overflow-y-auto"
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
              serialNumber: form.trackingType === 'serialized' || item?.trackingType === 'serialized' ? form.serialNumber : undefined,
              totalQuantity: (item?.trackingType ?? form.trackingType) === 'serialized' ? 1 : Number(form.totalQuantity || 1),
              condition: form.condition,
              notes: form.notes || undefined,
              specifications,
            });
          } catch (error) {
            setSpecError(error instanceof Error ? error.message : 'Invalid specifications.');
          }
        }}
      >
        <h2 className="font-display text-xl font-semibold text-gold">{title}</h2>
        <input
          className="input-field"
          placeholder="Code (CAM-001)"
          required
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <input
          className="input-field"
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          aria-label="Category"
          className="input-field"
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
          <p className="text-xs text-gray-500">Tracking type: {item?.trackingType}</p>
        ) : (
          <select
            aria-label="Tracking type"
            className="input-field"
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
            className="input-field"
            placeholder="Serial / item ID"
            required
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
          />
        ) : (
          <input
            className="input-field"
            type="number"
            min={1}
            aria-label="Total quantity"
            value={form.totalQuantity}
            onChange={(e) => setForm({ ...form, totalQuantity: Number(e.target.value) })}
          />
        )}
        <select
          aria-label="Condition"
          className="input-field"
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
          className="input-field"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div className="rounded-lg border border-surface-border p-3">
          <p className="mb-2 text-sm font-semibold text-gold">Specifications</p>
          <div className="space-y-2">
            {specFields.map((field) => (
              <label key={field.key} className="block text-sm text-gray-300">
                {field.label}
                {field.type === 'select' ? (
                  <select
                    aria-label={field.label}
                    className="input-field mt-1"
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
                    className="input-field mt-1"
                    type={field.type === 'number' ? 'number' : 'text'}
                    min={field.type === 'number' ? 1 : undefined}
                    value={specs[field.key] ?? ''}
                    onChange={(e) => setSpecs({ ...specs, [field.key]: e.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
          {specError && <p className="mt-2 text-sm text-red-400">{specError}</p>}
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={pending || !form.category}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card max-h-[92vh] w-full max-w-xl overflow-y-auto">
        <h2 className="font-display text-xl font-semibold text-gold">Manage Categories</h2>
        <p className="mt-1 text-sm text-gray-400">Deactivating keeps historical equipment; it is hidden from new items.</p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (label.trim()) createMutation.mutate();
          }}
        >
          <input
            className="input-field flex-1"
            placeholder="New category name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
            Add
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <ul className="mt-4 space-y-2">
          {categories.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border px-3 py-2">
              {editing?.id === item.id ? (
                <input className="input-field flex-1" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
              ) : (
                <div>
                  <p className="text-sm text-gray-100">{item.label}</p>
                  <p className="text-xs text-gray-500">
                    {item.code} · {item.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                {editing?.id === item.id ? (
                  <button
                    type="button"
                    className="btn-primary px-3 py-1 text-xs"
                    onClick={() => updateMutation.mutate({ id: item.id, payload: { label: editLabel } })}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1 text-xs"
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
                  className="btn-secondary px-3 py-1 text-xs"
                  onClick={() => updateMutation.mutate({ id: item.id, payload: { isActive: !item.isActive } })}
                >
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto">
        <h2 className="font-display text-xl font-semibold text-gold">
          {equipment ? `${equipment.name} · ${equipment.code}` : 'Equipment history'}
        </h2>
        {loading || !equipment ? (
          <p className="py-6 text-sm text-gray-400">Loading history…</p>
        ) : (
          <>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-gray-500">Equipment</dt>
                <dd className="text-gray-100">{equipment.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-500">Code</dt>
                <dd className="text-gray-100">{equipment.code}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-500">Category</dt>
                <dd className="text-gray-100">{equipment.category}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-500">Tracking Type</dt>
                <dd className="capitalize text-gray-100">{equipment.trackingType}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-500">Serial / Item ID</dt>
                <dd className="text-gray-100">{equipment.serialNumber || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-500">Condition</dt>
                <dd className="text-gray-100">{equipment.condition}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-500">Status</dt>
                <dd className="text-gray-100">{equipment.status}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gold">Specifications</h3>
              {formatEquipmentSpecifications(equipment.specifications, equipment.category).length === 0 ? (
                <p className="mt-2 text-sm text-gray-400">No specifications recorded.</p>
              ) : (
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  {formatEquipmentSpecifications(equipment.specifications, equipment.category).map((row) => (
                    <div key={row.key}>
                      <dt className="text-xs uppercase text-gray-500">{row.label}</dt>
                      <dd className="text-gray-100">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <ul className="mt-4 space-y-3">
            {equipment.history.length === 0 && <p className="text-sm text-gray-400">No issue / return history yet.</p>}
            {equipment.history.map((row) => (
              <li key={row.id} className="rounded-lg border border-surface-border p-3 text-sm">
                <p className="text-gray-100">
                  {formatDate(row.occurredAt)} · {row.action}
                </p>
                <p className="text-xs text-gray-500">
                  {row.bookingNumber ? `Booking: ${row.bookingNumber}` : ''}
                  {row.staffName ? ` · Staff: ${row.staffName}` : ''}
                  {row.conditionOut ? ` · Condition Out: ${row.conditionOut}` : ''}
                  {row.conditionIn ? ` · Condition In: ${row.conditionIn}` : ''}
                </p>
                {row.notes && <p className="mt-1 text-gray-400">{row.notes}</p>}
              </li>
            ))}
            </ul>
          </>
        )}
        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, type ComponentType, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Car,
  CheckCircle2,
  Eye,
  Film,
  Image,
  Pencil,
  Plane,
  Plus,
  Search,
  Tags,
  Trash2,
  UserCog,
  Users,
  UserX,
  Video,
} from 'lucide-react';
import {
  StaffDetail,
  StaffFormData,
  StaffMember,
  StaffSortField,
  staffService,
} from '@/services/staff-service';
import { useAuthStore } from '@/stores/auth-store';
import { StaffFormModal } from '@/components/staff/StaffFormModal';
import { StaffViewModal } from '@/components/staff/StaffViewModal';
import { ArchiveStaffDialog } from '@/components/staff/ArchiveStaffDialog';
import { StaffCountUp } from '@/components/staff/StaffCountUp';
import {
  staffInitials,
  staffRoleGlyph,
  staffRoleTone,
  staffStatusTone,
  type StaffRoleGlyph,
} from '@/components/staff/staff-visual';
import { formatDate, formatStaffPayment, STAFF_ROLES } from '@/utils/staff-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';
import './staff/staff-page.css';

type StatusFilter = 'active' | 'inactive' | 'all';

function StaffHeroArt() {
  return (
    <svg viewBox="0 0 240 190" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="stfHeroGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#c9a227" />
        </linearGradient>
        <linearGradient id="stfHeroCyan" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx="128" cy="96" r="78" stroke="url(#stfHeroGold)" strokeOpacity="0.2" />
      <circle cx="128" cy="96" r="56" stroke="url(#stfHeroGold)" strokeOpacity="0.42" strokeWidth="1.5" />
      <circle cx="92" cy="88" r="18" stroke="url(#stfHeroGold)" strokeWidth="2" />
      <path d="M68 128 C72 108 112 108 116 128" stroke="url(#stfHeroGold)" strokeWidth="2" />
      <circle cx="148" cy="82" r="16" stroke="url(#stfHeroCyan)" strokeWidth="2" />
      <path d="M126 120 C130 102 166 102 170 120" stroke="url(#stfHeroCyan)" strokeWidth="2" />
      <rect x="168" y="118" width="28" height="20" rx="5" stroke="url(#stfHeroGold)" strokeWidth="1.8" />
      <circle cx="182" cy="128" r="5" stroke="url(#stfHeroCyan)" />
    </svg>
  );
}

function RoleIcon({ kind }: { kind: StaffRoleGlyph }) {
  const icons: Record<StaffRoleGlyph, ComponentType> = {
    photographer: Camera,
    videographer: Video,
    cinematographer: Film,
    editor: Film,
    drone: Plane,
    helper: Users,
    album: Image,
    assistant: UserCog,
    driver: Car,
    other: Users,
  };
  const Icon = icons[kind];
  return <Icon />;
}

export function StaffPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState<StaffSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [viewStaffId, setViewStaffId] = useState<string | null>(null);
  const [archiveStaff, setArchiveStaff] = useState<StaffMember | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const canCreate = hasPermission('staff.create');
  const canUpdate = hasPermission('staff.update');
  const canArchive = hasPermission('staff.archive');

  const listQuery = useQuery({
    queryKey: ['staff', page, search, statusFilter, roleFilter, sortBy, sortOrder],
    queryFn: () =>
      staffService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        role: roleFilter || undefined,
        sortBy,
        sortOrder,
      }),
  });

  const countKey = ['staff', 'counts', search, roleFilter] as const;
  const countBase = {
    page: 1,
    limit: 1,
    search: search || undefined,
    role: roleFilter || undefined,
  };

  const allCountQuery = useQuery({
    queryKey: [...countKey, 'all'],
    queryFn: () => staffService.list({ ...countBase, status: 'all' }),
  });
  const activeCountQuery = useQuery({
    queryKey: [...countKey, 'active'],
    queryFn: () => staffService.list({ ...countBase, status: 'active' }),
  });
  const inactiveCountQuery = useQuery({
    queryKey: [...countKey, 'inactive'],
    queryFn: () => staffService.list({ ...countBase, status: 'inactive' }),
  });

  const detailQuery = useQuery({
    queryKey: ['staff', 'detail', viewStaffId],
    queryFn: () => staffService.getById(viewStaffId!),
    enabled: Boolean(viewStaffId),
  });

  const createMutation = useMutation({
    mutationFn: staffService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setFormOpen(false);
      setSelectedStaff(null);
      setFeedback({ type: 'success', message: 'Staff member added successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to add staff member.'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffFormData> }) =>
      staffService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setFormOpen(false);
      setSelectedStaff(null);
      setViewStaffId(null);
      setFeedback({ type: 'success', message: 'Staff member updated successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update staff member.'),
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: staffService.archive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setArchiveStaff(null);
      setViewStaffId(null);
      setFeedback({ type: 'success', message: 'Staff member archived successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to archive staff member.'),
      });
    },
  });

  const staffMembers = listQuery.data?.items ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openCreate = () => {
    setFormMode('create');
    setSelectedStaff(null);
    setFormOpen(true);
  };

  const openEdit = (member: StaffMember | StaffDetail) => {
    setFormMode('edit');
    setSelectedStaff(member);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: StaffFormData) => {
    if (formMode === 'create') {
      createMutation.mutate(data);
      return;
    }

    if (selectedStaff) {
      updateMutation.mutate({ id: selectedStaff.id, data });
    }
  };

  return (
    <>
    <div className="dhara-stf">
      <div className="dhara-stf-ambient" aria-hidden>
        <span className="dhara-stf-orb is-maroon" />
        <span className="dhara-stf-orb is-gold" />
        <span className="dhara-stf-orb is-cyan" />
        <span className="dhara-stf-grid-bg" />
      </div>

      <section className="dhara-stf-hero">
        <span className="dhara-stf-lens" aria-hidden />
        <span className="dhara-stf-particles" aria-hidden />
        <div>
          <p className="dhara-stf-kicker">DHARA PHOTOGRAPHY ERP PRO</p>
          <h2>Staff Management</h2>
          <p className="dhara-stf-hero-copy">સ્ટાફ — ફોટોગ્રાફર અને પ્રોડક્શન ટીમ</p>
          {canCreate && (
            <div className="dhara-stf-hero-actions">
              <button type="button" className="dhara-stf-btn is-gold" onClick={openCreate}>
                <Plus />
                Add Staff
              </button>
            </div>
          )}
        </div>
        <div className="dhara-stf-hero-art">
          <span className="dhara-stf-hero-halo" aria-hidden />
          <StaffHeroArt />
        </div>
      </section>

      {feedback && (
        <div className={cn('dhara-stf-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
          {feedback.message}
        </div>
      )}

      <div className="dhara-stf-kpis">
        <article className="dhara-stf-kpi is-gold">
          <div className="dhara-stf-kpi-top">
            <div>
              <h3>Total Staff</h3>
              <p>All team members</p>
            </div>
            <span className="dhara-stf-icon">
              <Users />
            </span>
          </div>
          <strong>
            <StaffCountUp value={allCountQuery.data?.total ?? 0} />
          </strong>
        </article>
        <article className="dhara-stf-kpi is-green">
          <div className="dhara-stf-kpi-top">
            <div>
              <h3>Active Staff</h3>
              <p>Available for assignments</p>
            </div>
            <span className="dhara-stf-icon">
              <CheckCircle2 />
            </span>
          </div>
          <strong>
            <StaffCountUp value={activeCountQuery.data?.total ?? 0} />
          </strong>
        </article>
        <article className="dhara-stf-kpi is-amber">
          <div className="dhara-stf-kpi-top">
            <div>
              <h3>Inactive Staff</h3>
              <p>Archived / disabled</p>
            </div>
            <span className="dhara-stf-icon">
              <UserX />
            </span>
          </div>
          <strong>
            <StaffCountUp value={inactiveCountQuery.data?.total ?? 0} />
          </strong>
        </article>
        <article className="dhara-stf-kpi is-cyan">
          <div className="dhara-stf-kpi-top">
            <div>
              <h3>Designations</h3>
              <p>Role catalog</p>
            </div>
            <span className="dhara-stf-icon">
              <Tags />
            </span>
          </div>
          <strong>
            <StaffCountUp value={STAFF_ROLES.length} />
          </strong>
        </article>
      </div>

      <section className="dhara-stf-panel">
        <p className="dhara-stf-section-title">Roles</p>
        <div className="dhara-stf-cats">
          <button
            type="button"
            className={cn('dhara-stf-cat-tile', !roleFilter && 'is-on')}
            onClick={() => {
              setRoleFilter('');
              setPage(1);
            }}
          >
            <span className="dhara-stf-icon">
              <Users />
            </span>
            <span>
              <strong>All Roles</strong>
              <em>{listQuery.data?.total ?? staffMembers.length} in this list</em>
            </span>
          </button>
          {STAFF_ROLES.map((role) => (
            <button
              key={role.code}
              type="button"
              className={cn(
                'dhara-stf-cat-tile',
                staffRoleTone(role.code),
                roleFilter === role.code && 'is-on',
              )}
              onClick={() => {
                setRoleFilter(role.code);
                setPage(1);
              }}
            >
              <span className="dhara-stf-icon">
                <RoleIcon kind={staffRoleGlyph(role.code)} />
              </span>
              <span>
                <strong>{role.label}</strong>
                <em>{role.code}</em>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="dhara-stf-panel">
        <form className="dhara-stf-toolbar-row" onSubmit={handleSearchSubmit}>
          <div className="dhara-stf-input-wrap" style={{ flex: '1 1 18rem' }}>
            <Search />
            <input
              className="dhara-stf-input is-icon"
              placeholder="Search by name, code, mobile, or email"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <div className="dhara-stf-field">
            <label htmlFor="staff-status-filter">Status</label>
            <select
              id="staff-status-filter"
              className="dhara-stf-input"
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
          <div className="dhara-stf-field">
            <label htmlFor="staff-role-filter">Role</label>
            <select
              id="staff-role-filter"
              className="dhara-stf-input"
              value={roleFilter}
              onChange={(event) => {
                setPage(1);
                setRoleFilter(event.target.value);
              }}
            >
              <option value="">All Roles</option>
              {STAFF_ROLES.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div className="dhara-stf-field">
            <label htmlFor="staff-sort">Sort</label>
            <select
              id="staff-sort"
              className="dhara-stf-input"
              value={`${sortBy}:${sortOrder}`}
              onChange={(event) => {
                const [field, order] = event.target.value.split(':') as [StaffSortField, 'asc' | 'desc'];
                setPage(1);
                setSortBy(field);
                setSortOrder(order);
              }}
            >
              <option value="createdAt:desc">Newest</option>
              <option value="createdAt:asc">Oldest</option>
              <option value="fullName:asc">Name A–Z</option>
              <option value="fullName:desc">Name Z–A</option>
              <option value="staffCode:asc">Code</option>
              <option value="role:asc">Role</option>
              <option value="mobile:asc">Mobile</option>
              <option value="joiningDate:desc">Joining date</option>
            </select>
          </div>
          <button type="submit" className="dhara-stf-btn is-gold">
            Search
          </button>
        </form>
      </section>

      {listQuery.isLoading ? (
        <>
          <p className="dhara-stf-note">Loading staff...</p>
          <div className="dhara-stf-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="dhara-stf-skeleton" style={{ minHeight: '16rem' }} />
            ))}
          </div>
        </>
      ) : listQuery.isError ? (
        <div className="dhara-stf-error">
          <UserCog />
          <p>{getApiErrorMessage(listQuery.error, 'Failed to load staff members.')}</p>
          <button type="button" className="dhara-stf-btn is-gold" onClick={() => void listQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : staffMembers.length === 0 ? (
        <div className="dhara-stf-empty">
          <Users />
          <h3>No staff members found.</h3>
          {canCreate && (
            <button type="button" className="dhara-stf-btn is-gold" onClick={openCreate}>
              <Plus />
              Add Staff
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="dhara-stf-grid">
            {staffMembers.map((member) => (
              <article key={member.id} className={cn('dhara-stf-gear', staffRoleTone(member.role))}>
                <div className="dhara-stf-gear-top">
                  <span className={cn('dhara-stf-gear-art', staffRoleTone(member.role))}>
                    <span className="dhara-stf-avatar">{staffInitials(member.fullName)}</span>
                  </span>
                  <span className={cn('dhara-stf-pill', staffStatusTone(member.isActive))}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <h3>{member.fullName}</h3>
                  <p className="dhara-stf-gear-meta">
                    {member.staffCode} · {member.roleLabel}
                  </p>
                  <p className="dhara-stf-gear-meta">{member.mobile || '—'}</p>
                  <p className="dhara-stf-gear-meta">{formatStaffPayment(member)}</p>
                  <p className="dhara-stf-gear-meta">
                    Joined {formatDate(member.joiningDate)} · {member.totalAssignments} assignments
                  </p>
                </div>
                <div className="dhara-stf-gear-actions">
                  <button
                    type="button"
                    className="dhara-stf-btn"
                    onClick={() => setViewStaffId(member.id)}
                    aria-label="View staff"
                  >
                    <Eye />
                    View
                  </button>
                  {canUpdate && (
                    <button
                      type="button"
                      className="dhara-stf-btn"
                      onClick={() => openEdit(member)}
                      aria-label="Edit staff"
                    >
                      <Pencil />
                      Edit
                    </button>
                  )}
                  {canArchive && (
                    <button
                      type="button"
                      className="dhara-stf-btn"
                      onClick={() => setArchiveStaff(member)}
                      aria-label="Archive staff"
                    >
                      <Trash2 />
                      Archive
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-between">
              <p className="dhara-stf-note" style={{ margin: 0 }}>
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="dhara-stf-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="dhara-stf-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </div>

      <StaffFormModal
        open={formOpen}
        mode={formMode}
        staff={selectedStaff}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setFormOpen(false);
          setSelectedStaff(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <StaffViewModal
        open={Boolean(viewStaffId)}
        staff={detailQuery.data ?? null}
        isLoading={detailQuery.isLoading}
        onClose={() => setViewStaffId(null)}
        onEdit={(member) => {
          setViewStaffId(null);
          openEdit(member);
        }}
      />

      <ArchiveStaffDialog
        open={Boolean(archiveStaff)}
        staff={archiveStaff}
        isSubmitting={archiveMutation.isPending}
        onClose={() => setArchiveStaff(null)}
        onConfirm={() => archiveStaff && archiveMutation.mutate(archiveStaff.id)}
      />
    </>
  );
}

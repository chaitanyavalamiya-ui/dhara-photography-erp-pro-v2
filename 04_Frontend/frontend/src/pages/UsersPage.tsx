import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  Unlock,
  UserX,
  Users,
} from 'lucide-react';
import { AppUser, usersService } from '@/services/users-service';
import { useAuthStore } from '@/stores/auth-store';
import { UserFormModal } from '@/components/users/UserFormModal';
import { ArchiveUserDialog } from '@/components/users/ArchiveUserDialog';
import { UnlockUserDialog } from '@/components/users/UnlockUserDialog';
import { ConfirmPasswordResetDialog } from '@/components/users/ConfirmPasswordResetDialog';
import { UsersCountUp } from '@/components/users/UsersCountUp';
import { userInitials, userStatusTone } from '@/components/users/user-visual';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';
import './users/users-page.css';

type StatusFilter = 'active' | 'inactive' | 'all';

function UsersHeroArt() {
  return (
    <svg viewBox="0 0 240 190" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="usrHeroGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#c9a227" />
        </linearGradient>
        <linearGradient id="usrHeroCyan" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx="128" cy="98" r="80" stroke="url(#usrHeroGold)" strokeOpacity="0.2" />
      <circle cx="128" cy="98" r="58" stroke="url(#usrHeroGold)" strokeOpacity="0.42" strokeWidth="1.5" />
      <path
        d="M128 42 L178 62 V104 C178 136 156 156 128 168 C100 156 78 136 78 104 V62 Z"
        stroke="url(#usrHeroGold)"
        strokeWidth="2.2"
        fill="rgba(255,212,90,0.06)"
      />
      <circle cx="128" cy="92" r="16" stroke="url(#usrHeroCyan)" strokeWidth="2" />
      <path d="M108 122 C112 110 144 110 148 122" stroke="url(#usrHeroCyan)" strokeWidth="2" />
    </svg>
  );
}

function formatLogin(value: string | null) {
  return value ? new Date(value).toLocaleString('en-IN') : 'Never';
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [archiveUser, setArchiveUser] = useState<AppUser | null>(null);
  const [unlockUser, setUnlockUser] = useState<AppUser | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<AppUser | null>(null);
  const [pendingUpdatePayload, setPendingUpdatePayload] = useState<{
    id: string;
    payload: Parameters<typeof usersService.update>[1];
  } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const canManage = hasPermission('users.manage');

  const listQuery = useQuery({
    queryKey: ['users', page, search, statusFilter],
    queryFn: () =>
      usersService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const countKey = ['users', 'counts', search] as const;
  const countBase = { page: 1, limit: 1, search: search || undefined };

  const allCountQuery = useQuery({
    queryKey: [...countKey, 'all'],
    queryFn: () => usersService.list({ ...countBase, status: 'all' }),
  });
  const activeCountQuery = useQuery({
    queryKey: [...countKey, 'active'],
    queryFn: () => usersService.list({ ...countBase, status: 'active' }),
  });
  const inactiveCountQuery = useQuery({
    queryKey: [...countKey, 'inactive'],
    queryFn: () => usersService.list({ ...countBase, status: 'inactive' }),
  });

  const rolesQuery = useQuery({
    queryKey: ['users', 'roles'],
    queryFn: usersService.getRoles,
  });

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setFormOpen(false);
      setFeedback({ type: 'success', message: 'User created successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to create user.'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof usersService.update>[1] }) =>
      usersService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setFormOpen(false);
      setSelectedUser(null);
      setPasswordResetUser(null);
      setPendingUpdatePayload(null);
      setFeedback({ type: 'success', message: 'User updated successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update user.'),
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: usersService.archive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setArchiveUser(null);
      setFeedback({ type: 'success', message: 'User archived successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to archive user.'),
      });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: usersService.unlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setUnlockUser(null);
      setFeedback({ type: 'success', message: 'User unlocked successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to unlock user.'),
      });
    },
  });

  const totalUsers = allCountQuery.data?.total ?? 0;
  const activeUsers = activeCountQuery.data?.total ?? 0;
  const inactiveUsers = inactiveCountQuery.data?.total ?? 0;
  const roles = rolesQuery.data ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;
  const items = listQuery.data?.items ?? [];

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <>
    <div className="dhara-usr">
      <div className="dhara-usr-ambient" aria-hidden>
        <span className="dhara-usr-orb is-maroon" />
        <span className="dhara-usr-orb is-gold" />
        <span className="dhara-usr-orb is-cyan" />
        <span className="dhara-usr-grid-bg" />
      </div>

      <section className="dhara-usr-hero">
        <span className="dhara-usr-lens" aria-hidden />
        <span className="dhara-usr-particles" aria-hidden />
        <div>
          <p className="dhara-usr-kicker">Dhara Photography ERP Pro</p>
          <h2>Users & Security</h2>
          <p className="dhara-usr-hero-copy">યુઝર્સ અને સિક્યુરિટી — લૉગિન અને રોલ ઍક્સેસ</p>
          {canManage && (
            <div className="dhara-usr-hero-actions">
              <button
                type="button"
                className="dhara-usr-btn is-gold"
                onClick={() => {
                  setFormMode('create');
                  setSelectedUser(null);
                  setFormOpen(true);
                }}
              >
                <Plus />
                Add User
              </button>
            </div>
          )}
        </div>
        <div className="dhara-usr-hero-art">
          <span className="dhara-usr-hero-halo" aria-hidden />
          <UsersHeroArt />
        </div>
      </section>

      {feedback && (
        <div className={cn('dhara-usr-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
          {feedback.message}
        </div>
      )}

      <div className="dhara-usr-kpis">
        <article className="dhara-usr-kpi is-gold">
          <div className="dhara-usr-kpi-top">
            <div>
              <h3>Total Users</h3>
              <p>All accounts</p>
            </div>
            <span className="dhara-usr-icon">
              <Users />
            </span>
          </div>
          <strong>
            <UsersCountUp value={totalUsers} />
          </strong>
        </article>
        <article className="dhara-usr-kpi is-green">
          <div className="dhara-usr-kpi-top">
            <div>
              <h3>Active Users</h3>
              <p>Can sign in</p>
            </div>
            <span className="dhara-usr-icon">
              <CheckCircle2 />
            </span>
          </div>
          <strong>
            <UsersCountUp value={activeUsers} />
          </strong>
        </article>
        <article className="dhara-usr-kpi is-amber">
          <div className="dhara-usr-kpi-top">
            <div>
              <h3>Inactive Users</h3>
              <p>Archived / disabled</p>
            </div>
            <span className="dhara-usr-icon">
              <UserX />
            </span>
          </div>
          <strong>
            <UsersCountUp value={inactiveUsers} />
          </strong>
        </article>
        <article className="dhara-usr-kpi is-cyan">
          <div className="dhara-usr-kpi-top">
            <div>
              <h3>Roles</h3>
              <p>Assignable roles</p>
            </div>
            <span className="dhara-usr-icon">
              <KeyRound />
            </span>
          </div>
          <strong>
            <UsersCountUp value={roles.length} />
          </strong>
        </article>
      </div>

      {roles.length > 0 && (
        <section className="dhara-usr-panel">
          <p className="dhara-usr-section-title">Assignable roles</p>
          <div className="dhara-usr-roles">
            {roles.map((role) => (
              <article key={role.id} className="dhara-usr-role">
                <span className="dhara-usr-icon">
                  <Shield />
                </span>
                <div>
                  <strong>{role.name}</strong>
                  <em>
                    {role.code} · Rank {role.hierarchyRank}
                  </em>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="dhara-usr-panel">
        <div className="dhara-usr-toolbar-row">
          <div className="dhara-usr-input-wrap" style={{ flex: '1 1 18rem' }}>
            <Search />
            <input
              className="dhara-usr-input is-icon"
              placeholder="Search by name or email"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applySearch();
              }}
            />
          </div>
          <div className="dhara-usr-field">
            <label htmlFor="users-status-filter">Status</label>
            <select
              id="users-status-filter"
              className="dhara-usr-input"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
          </div>
          <button type="button" className="dhara-usr-btn is-gold" onClick={applySearch}>
            Search
          </button>
        </div>
      </section>

      {listQuery.isLoading ? (
        <div className="dhara-usr-kpis">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="dhara-usr-skeleton" style={{ minHeight: '8rem' }} />
          ))}
          <p className="dhara-usr-note">Loading users...</p>
        </div>
      ) : listQuery.isError ? (
        <div className="dhara-usr-error">
          <Shield />
          <p>{getApiErrorMessage(listQuery.error, 'Failed to load users.')}</p>
          <button type="button" className="dhara-usr-btn is-gold" onClick={() => void listQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="dhara-usr-empty">
          <Users />
          <h3>No users found.</h3>
          {canManage && (
            <button
              type="button"
              className="dhara-usr-btn is-gold"
              onClick={() => {
                setFormMode('create');
                setSelectedUser(null);
                setFormOpen(true);
              }}
            >
              <Plus />
              Add User
            </button>
          )}
        </div>
      ) : (
        <div className="dhara-usr-card">
          <div className="dhara-usr-table-wrap">
            <table className="dhara-usr-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Created</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="dhara-usr-avatar">{userInitials(user.fullName)}</span>
                        <p className="dhara-usr-name">{user.fullName}</p>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.roles.map((role) => role.name).join(', ')}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <span className={cn('dhara-usr-pill', userStatusTone(user.isActive, user.isLocked))}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {user.isLocked && (
                          <span className="dhara-usr-pill is-amber">Locked</span>
                        )}
                      </div>
                    </td>
                    <td>{formatLogin(user.lastLoginAt)}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString('en-IN')}</td>
                    {canManage && (
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="dhara-usr-btn"
                            onClick={() => {
                              setFormMode('edit');
                              setSelectedUser(user);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil />
                            Edit
                          </button>
                          {user.isLocked && (
                            <button
                              type="button"
                              className="dhara-usr-btn"
                              onClick={() => setUnlockUser(user)}
                            >
                              <Unlock />
                              Unlock
                            </button>
                          )}
                          {user.id !== currentUserId && (
                            <button
                              type="button"
                              className="dhara-usr-btn"
                              onClick={() => setArchiveUser(user)}
                            >
                              <Trash2 />
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="dhara-usr-note" style={{ margin: 0 }}>
                Page {page} of {totalPages} · {listQuery.data?.total ?? 0} users
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="dhara-usr-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="dhara-usr-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>

      <UserFormModal
        open={formOpen}
        mode={formMode}
        user={selectedUser}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setFormOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={(values) => {
          if (formMode === 'create') {
            createMutation.mutate(values as Parameters<typeof usersService.create>[0]);
            return;
          }

          if (selectedUser) {
            const payload = values as {
              fullName: string;
              email: string;
              password?: string;
              isActive: boolean;
              roleIds: string[];
            };
            const updatePayload = {
              fullName: payload.fullName,
              email: payload.email,
              isActive: payload.isActive,
              roleIds: payload.roleIds,
              ...(payload.password ? { password: payload.password } : {}),
            };

            if (payload.password) {
              setPendingUpdatePayload({
                id: selectedUser.id,
                payload: updatePayload,
              });
              setPasswordResetUser(selectedUser);
              return;
            }

            updateMutation.mutate({
              id: selectedUser.id,
              payload: updatePayload,
            });
          }
        }}
      />

      <ConfirmPasswordResetDialog
        open={Boolean(passwordResetUser)}
        user={passwordResetUser}
        isSubmitting={updateMutation.isPending}
        onClose={() => {
          setPasswordResetUser(null);
          setPendingUpdatePayload(null);
        }}
        onConfirm={() => {
          if (pendingUpdatePayload) {
            updateMutation.mutate(pendingUpdatePayload);
          }
        }}
      />

      <UnlockUserDialog
        open={Boolean(unlockUser)}
        user={unlockUser}
        isSubmitting={unlockMutation.isPending}
        onClose={() => setUnlockUser(null)}
        onConfirm={() => {
          if (unlockUser) {
            unlockMutation.mutate(unlockUser.id);
          }
        }}
      />

      <ArchiveUserDialog
        open={Boolean(archiveUser)}
        user={archiveUser}
        isSubmitting={archiveMutation.isPending}
        onClose={() => setArchiveUser(null)}
        onConfirm={() => {
          if (archiveUser) {
            archiveMutation.mutate(archiveUser.id);
          }
        }}
      />
    </>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Shield, Trash2 } from 'lucide-react';
import { AppUser, usersService } from '@/services/users-service';
import { useAuthStore } from '@/stores/auth-store';
import { UserFormModal } from '@/components/users/UserFormModal';
import { ArchiveUserDialog } from '@/components/users/ArchiveUserDialog';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

type StatusFilter = 'active' | 'inactive' | 'all';

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-100">Users</h2>
          <p className="mt-1 text-sm text-gray-500">Manage ERP login accounts and role access.</p>
        </div>
        {canManage && (
          <button
            type="button"
            className="btn-primary inline-flex items-center"
            onClick={() => {
              setFormMode('create');
              setSelectedUser(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add User
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

      <div className="card">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              className="input-field w-full pl-10"
              placeholder="Search by name or email"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setSearch(searchInput.trim());
                  setPage(1);
                }
              }}
            />
          </div>
          <select
            className="input-field sm:w-40"
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
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSearch(searchInput.trim());
              setPage(1);
            }}
          >
            Search
          </button>
        </div>

        {listQuery.isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading users...</div>
        ) : listQuery.isError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
            Failed to load users.
          </div>
        ) : (listQuery.data?.items.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-dashed border-surface-border px-6 py-10 text-center text-sm text-gray-500">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Roles</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Last Login</th>
                  {canManage && <th className="px-3 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {listQuery.data?.items.map((user) => (
                  <tr key={user.id} className="border-b border-surface-border/70 hover:bg-white/[0.02]">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gold/70" />
                        <span className="font-medium text-gray-100">{user.fullName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-gray-300">{user.email}</td>
                    <td className="px-3 py-4 text-gray-300">
                      {user.roles.map((role) => role.name).join(', ')}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          user.isActive
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-400',
                        )}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs text-gray-500">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString('en-IN')
                        : 'Never'}
                    </td>
                    {canManage && (
                      <td className="px-3 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2.5 py-1.5 text-xs text-gray-300 hover:border-gold/40 hover:text-gold"
                            onClick={() => {
                              setFormMode('edit');
                              setSelectedUser(user);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          {user.id !== currentUserId && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                              onClick={() => setArchiveUser(user)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
            updateMutation.mutate({
              id: selectedUser.id,
              payload: {
                fullName: payload.fullName,
                email: payload.email,
                isActive: payload.isActive,
                roleIds: payload.roleIds,
                ...(payload.password ? { password: payload.password } : {}),
              },
            });
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
    </div>
  );
}

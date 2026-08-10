import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Plus, Search, Trash2, UserCog } from 'lucide-react';
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
import { formatDate, formatStaffPayment, STAFF_ROLES } from '@/utils/staff-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

type StatusFilter = 'active' | 'inactive' | 'all';

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

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const toggleSort = (field: StaffSortField) => {
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-100">Staff</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage photographers, editors, assistants, and booking team assignments.
          </p>
        </div>
        {canCreate && (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
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
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              className="input-field pl-10"
              placeholder="Search by name, code, mobile, or email"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="input-field w-auto"
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
              className="input-field w-auto"
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
        </div>

        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-elevated text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort('staffCode')}>
                    Staff Code
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort('fullName')}>
                    Name
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort('role')}>
                    Role
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort('mobile')}>
                    Mobile
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort('joiningDate')}>
                    Joining Date
                  </button>
                </th>
                <th className="px-4 py-3">Payment / Rate</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Loading staff...
                  </td>
                </tr>
              ) : staffMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <UserCog className="mx-auto mb-2 h-8 w-8 text-gray-600" />
                    No staff members found.
                  </td>
                </tr>
              ) : (
                staffMembers.map((member) => (
                  <tr key={member.id} className="border-t border-surface-border">
                    <td className="px-4 py-3 font-medium text-gold">{member.staffCode}</td>
                    <td className="px-4 py-3 text-gray-100">{member.fullName}</td>
                    <td className="px-4 py-3 text-gray-300">{member.roleLabel}</td>
                    <td className="px-4 py-3 text-gray-300">{member.mobile || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{formatDate(member.joiningDate)}</td>
                    <td className="px-4 py-3 text-gray-300">{formatStaffPayment(member)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          member.isActive
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-400',
                        )}
                      >
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
                          onClick={() => setViewStaffId(member.id)}
                          aria-label="View staff"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canUpdate && (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
                            onClick={() => openEdit(member)}
                            aria-label="Edit staff"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canArchive && (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-400/10 hover:text-red-400"
                            onClick={() => setArchiveStaff(member)}
                            aria-label="Archive staff"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
            <p>
              Page {page} of {totalPages}
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
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Booking } from '@/services/bookings-service';
import { BookingTeamMember, staffService } from '@/services/staff-service';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, formatDate, STAFF_ROLES } from '@/utils/staff-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

interface BookingTeamSectionProps {
  booking: Booking;
}

export function BookingTeamSection({ booking }: BookingTeamSectionProps) {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canAssign = hasPermission('staff.assign');

  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<BookingTeamMember | null>(null);
  const [staffId, setStaffId] = useState('');
  const [role, setRole] = useState('photographer');
  const [assignmentDate, setAssignmentDate] = useState(booking.eventDate?.slice(0, 10) ?? '');
  const [agreedRate, setAgreedRate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ['bookings', booking.id, 'staff'],
    queryFn: () => staffService.listBookingTeam(booking.id),
    initialData: booking.team,
  });

  const staffOptionsQuery = useQuery({
    queryKey: ['staff', 'options'],
    queryFn: () => staffService.list({ status: 'active', limit: 100 }),
    enabled: canAssign && showForm,
  });

  const assignMutation = useMutation({
    mutationFn: (payload: Parameters<typeof staffService.assignToBooking>[1]) =>
      staffService.assignToBooking(booking.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'staff'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      resetForm();
      setError(null);
    },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, 'Failed to assign staff.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      assignmentId,
      payload,
    }: {
      assignmentId: string;
      payload: Parameters<typeof staffService.updateBookingAssignment>[2];
    }) => staffService.updateBookingAssignment(booking.id, assignmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'staff'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      resetForm();
      setError(null);
    },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, 'Failed to update assignment.'));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      staffService.removeBookingAssignment(booking.id, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'staff'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, 'Failed to remove assignment.'));
    },
  });

  const team = teamQuery.data ?? [];

  const resetForm = () => {
    setShowForm(false);
    setEditingAssignment(null);
    setStaffId('');
    setRole('photographer');
    setAssignmentDate(booking.eventDate?.slice(0, 10) ?? '');
    setAgreedRate('');
    setNotes('');
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (assignment: BookingTeamMember) => {
    setEditingAssignment(assignment);
    setStaffId(assignment.staffId);
    setRole(assignment.role);
    setAssignmentDate(assignment.assignmentDate?.slice(0, 10) ?? booking.eventDate?.slice(0, 10) ?? '');
    setAgreedRate(assignment.agreedRate != null ? String(assignment.agreedRate) : '');
    setNotes(assignment.notes ?? '');
    setShowForm(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      staffId,
      role,
      assignmentDate: assignmentDate || undefined,
      agreedRate: agreedRate ? Number(agreedRate) : undefined,
      notes: notes || undefined,
      syncExpense: true,
    };

    if (editingAssignment) {
      updateMutation.mutate({ assignmentId: editingAssignment.id, payload });
      return;
    }

    assignMutation.mutate(payload);
  };

  return (
    <div className="mt-6 rounded-lg border border-surface-border bg-surface-elevated p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gold" />
          <h3 className="font-display text-lg font-semibold text-gold">Team</h3>
        </div>
        {canAssign && (
          <button type="button" className="btn-secondary text-xs" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Assign Staff
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {team.length === 0 ? (
        <p className="text-sm text-gray-500">No team members assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {team.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-2 rounded-md border border-surface-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-100">
                  {member.roleLabel} — {member.staffName}
                </p>
                <p className="text-xs text-gray-500">
                  {member.staffCode}
                  {member.assignmentDate ? ` · ${formatDate(member.assignmentDate)}` : ''}
                  {member.agreedRate != null ? ` · ${formatCurrency(member.agreedRate)}` : ''}
                </p>
                {member.notes && <p className="mt-1 text-xs text-gray-400">{member.notes}</p>}
              </div>
              {canAssign && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
                    onClick={() => openEdit(member)}
                    aria-label="Edit assignment"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-red-400/10 hover:text-red-400"
                    onClick={() => removeMutation.mutate(member.id)}
                    aria-label="Remove assignment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && canAssign && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 rounded-lg border border-gold/20 bg-surface p-4"
        >
          <p className="text-sm font-medium text-gray-200">
            {editingAssignment ? 'Update Assignment' : 'Assign Team Member'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Staff Member</label>
              <select
                className="input-field"
                value={staffId}
                onChange={(event) => setStaffId(event.target.value)}
                required
                disabled={Boolean(editingAssignment)}
              >
                <option value="">Select staff</option>
                {(staffOptionsQuery.data?.items ?? []).map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} ({member.roleLabel})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Role on Booking</label>
              <select
                className="input-field"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                required
              >
                {STAFF_ROLES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Assignment Date</label>
              <input
                className="input-field"
                type="date"
                value={assignmentDate}
                onChange={(event) => setAssignmentDate(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Agreed Rate (₹)</label>
              <input
                className="input-field"
                type="number"
                min={0}
                step="0.01"
                value={agreedRate}
                onChange={(event) => setAgreedRate(event.target.value)}
                placeholder="Optional payment amount"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-400">Notes</label>
              <textarea
                className="input-field min-h-[70px]"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
            <button
              type="submit"
              className={cn('btn-primary')}
              disabled={assignMutation.isPending || updateMutation.isPending}
            >
              {assignMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingAssignment
                  ? 'Update Assignment'
                  : 'Assign Staff'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

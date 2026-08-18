import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { StaffDetail } from '@/services/staff-service';
import { equipmentService } from '@/services/equipment-service';
import { formatCurrency, formatDate, formatStaffPayment } from '@/utils/staff-form';
import { useAuthStore } from '@/stores/auth-store';

interface StaffViewModalProps {
  open: boolean;
  staff: StaffDetail | null;
  isLoading?: boolean;
  onClose: () => void;
  onEdit: (staff: StaffDetail) => void;
}

export function StaffViewModal({ open, staff, isLoading, onClose, onEdit }: StaffViewModalProps) {
  const canEquipment = useAuthStore((s) => s.hasPermission('equipment.read'));
  const equipmentQuery = useQuery({
    queryKey: ['equipment', 'staff', staff?.id],
    queryFn: () => equipmentService.getStaffSummary(staff!.id),
    enabled: open && canEquipment && Boolean(staff?.id),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[92vh] w-full max-w-4xl overflow-y-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              {staff?.staffCode ?? 'Loading...'}
            </p>
            <h2 className="font-display text-2xl font-semibold text-gold">
              {staff?.fullName ?? 'Staff Profile'}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {staff ? `${staff.roleLabel} · ${staff.isActive ? 'Active' : 'Inactive'}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !staff ? (
          <p className="py-8 text-center text-sm text-gray-400">Loading staff profile...</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Mobile', staff.mobile || '—'],
                ['Email', staff.email || '—'],
                ['Joining Date', formatDate(staff.joiningDate)],
                ['Payment / Rate', formatStaffPayment(staff)],
                ['Total Assignments', String(staff.totalAssignments)],
                ['Total Expenses', formatCurrency(staff.totalExpenseAmount)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-surface-border bg-surface-elevated p-4"
                >
                  <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
                  <p className="mt-1 text-sm text-gray-100">{value}</p>
                </div>
              ))}
            </div>

            {staff.address && (
              <div className="mt-4 rounded-lg border border-surface-border bg-surface-elevated p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">Address</p>
                <p className="mt-1 text-sm text-gray-300">{staff.address}</p>
              </div>
            )}

            {staff.notes && (
              <div className="mt-4 rounded-lg border border-surface-border bg-surface-elevated p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{staff.notes}</p>
              </div>
            )}

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border border-surface-border bg-surface-elevated p-4">
                <h3 className="text-sm font-semibold text-gold">Upcoming Bookings</h3>
                {staff.upcomingBookings.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">No upcoming assignments.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {staff.upcomingBookings.map((assignment) => (
                      <li
                        key={assignment.id}
                        className="rounded-md border border-surface-border px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-gray-100">
                          {assignment.bookingNumber} · {assignment.eventType}
                        </p>
                        <p className="text-gray-400">
                          {assignment.roleLabel} · {formatDate(assignment.eventDate)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-lg border border-surface-border bg-surface-elevated p-4">
                <h3 className="text-sm font-semibold text-gold">Recent Completed Bookings</h3>
                {staff.recentCompletedBookings.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">No completed assignments yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {staff.recentCompletedBookings.map((assignment) => (
                      <li
                        key={assignment.id}
                        className="rounded-md border border-surface-border px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-gray-100">
                          {assignment.bookingNumber} · {assignment.eventType}
                        </p>
                        <p className="text-gray-400">
                          {assignment.roleLabel} · {formatDate(assignment.eventDate)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="mt-4 rounded-lg border border-surface-border bg-surface-elevated p-4">
              <h3 className="text-sm font-semibold text-gold">Recent Payments / Expenses</h3>
              {staff.recentExpenses.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No staff-related expenses recorded.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2">Booking</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.recentExpenses.map((expense) => (
                        <tr key={expense.id} className="border-t border-surface-border">
                          <td className="px-3 py-2 text-gray-300">{formatDate(expense.expenseDate)}</td>
                          <td className="px-3 py-2 text-gray-100">
                            {expense.description || 'Staff payment'}
                          </td>
                          <td className="px-3 py-2 text-gray-400">
                            {expense.bookingNumber || '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gold">
                            {formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {canEquipment && (
              <section className="mt-4 rounded-lg border border-surface-border bg-surface-elevated p-4">
                <h3 className="text-sm font-semibold text-gold">Equipment History</h3>
                {equipmentQuery.data ? (
                  <>
                    <div className="mt-3 grid gap-3 sm:grid-cols-5">
                      {[
                        ['Total Issues', equipmentQuery.data.totalIssues],
                        ['Currently Holding', equipmentQuery.data.currentlyHolding],
                        ['Returned', equipmentQuery.data.returned],
                        ['Missing', equipmentQuery.data.missing],
                        ['Damaged', equipmentQuery.data.damaged],
                      ].map(([label, value]) => (
                        <div key={String(label)}>
                          <p className="text-xs uppercase text-gray-500">{label}</p>
                          <p className="text-sm text-gray-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <ul className="mt-3 space-y-2 text-sm">
                      {equipmentQuery.data.issues.map((issue) => (
                        <li key={issue.id} className="rounded-md border border-surface-border px-3 py-2">
                          {issue.issueNumber} · {issue.bookingNumber} · {issue.status}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">No equipment issues for this staff member.</p>
                )}
              </section>
            )}
          </>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-surface-border pt-5">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {staff && (
            <button type="button" className="btn-primary" onClick={() => onEdit(staff)}>
              Edit Staff
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

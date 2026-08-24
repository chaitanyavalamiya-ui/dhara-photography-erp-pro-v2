import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { StaffDetail } from '@/services/staff-service';
import { equipmentService } from '@/services/equipment-service';
import { listCurrentlyHoldingEquipment } from '@/utils/equipment-possession';
import { formatCurrency, formatDate, formatStaffPayment } from '@/utils/staff-form';
import { useAuthStore } from '@/stores/auth-store';
import { staffInitials, staffStatusTone } from '@/components/staff/staff-visual';
import { cn } from '@/utils/cn';
import '@/pages/staff/staff-page.css';

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
  const holdingRows = listCurrentlyHoldingEquipment(equipmentQuery.data?.issues ?? []);

  if (!open) return null;

  return (
    <div className="dhara-stf-modal">
      <div className="dhara-stf-modal-card is-profile">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            {staff && (
              <span className="dhara-stf-avatar is-lg">{staffInitials(staff.fullName)}</span>
            )}
            <div>
              <p className="dhara-stf-kicker">{staff?.staffCode ?? 'Loading...'}</p>
              <h2>{staff?.fullName ?? 'Staff Profile'}</h2>
              {staff && (
                <p className="dhara-stf-modal-sub">
                  {staff.roleLabel} ·{' '}
                  <span className={cn('dhara-stf-pill', staffStatusTone(staff.isActive))}>
                    {staff.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="dhara-stf-icon-btn" aria-label="Close">
            <X />
          </button>
        </div>

        {isLoading || !staff ? (
          <p className="dhara-stf-note">Loading staff profile...</p>
        ) : (
          <>
            <p className="dhara-stf-section-title">Staff Information</p>
            <div className="dhara-stf-facts">
              {[
                ['Mobile', staff.mobile || '—'],
                ['Email', staff.email || '—'],
                ['Joining Date', formatDate(staff.joiningDate)],
                ['Payment / Rate', formatStaffPayment(staff)],
                ['Total Assignments', String(staff.totalAssignments)],
                ['Total Expenses', formatCurrency(staff.totalExpenseAmount)],
              ].map(([label, value]) => (
                <div key={label} className="dhara-stf-fact">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            {staff.address && (
              <div className="dhara-stf-fact" style={{ marginTop: '0.85rem' }}>
                <span>Address</span>
                <strong>{staff.address}</strong>
              </div>
            )}

            {staff.notes && (
              <div className="dhara-stf-fact" style={{ marginTop: '0.85rem' }}>
                <span>Notes</span>
                <strong style={{ whiteSpace: 'pre-wrap' }}>{staff.notes}</strong>
              </div>
            )}

            <div className="dhara-stf-assign-grid">
              <section>
                <h3 className="dhara-stf-section-title">Upcoming Bookings</h3>
                {staff.upcomingBookings.length === 0 ? (
                  <p className="dhara-stf-note">No upcoming assignments.</p>
                ) : (
                  <ul className="dhara-stf-assign-list">
                    {staff.upcomingBookings.map((assignment) => (
                      <li key={assignment.id} className="dhara-stf-booking-pick">
                        <p>
                          {assignment.bookingNumber} · {assignment.eventType}
                        </p>
                        <span>
                          {assignment.roleLabel} · {formatDate(assignment.eventDate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="dhara-stf-section-title">Recent Completed Bookings</h3>
                {staff.recentCompletedBookings.length === 0 ? (
                  <p className="dhara-stf-note">No completed assignments yet.</p>
                ) : (
                  <ul className="dhara-stf-assign-list">
                    {staff.recentCompletedBookings.map((assignment) => (
                      <li key={assignment.id} className="dhara-stf-booking-pick">
                        <p>
                          {assignment.bookingNumber} · {assignment.eventType}
                        </p>
                        <span>
                          {assignment.roleLabel} · {formatDate(assignment.eventDate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section>
              <h3 className="dhara-stf-section-title">Recent Payments / Expenses</h3>
              {staff.recentExpenses.length === 0 ? (
                <p className="dhara-stf-note">No staff-related expenses recorded.</p>
              ) : (
                <div className="dhara-stf-table-wrap">
                  <table className="dhara-stf-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Booking</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.recentExpenses.map((expense) => (
                        <tr key={expense.id}>
                          <td>{formatDate(expense.expenseDate)}</td>
                          <td>{expense.description || 'Staff payment'}</td>
                          <td>{expense.bookingNumber || '—'}</td>
                          <td className="dhara-stf-amt is-gold">{formatCurrency(expense.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {canEquipment && (
              <section>
                <h3 className="dhara-stf-section-title">Currently Holding Equipment</h3>
                {equipmentQuery.isLoading ? (
                  <p className="dhara-stf-note">Loading equipment...</p>
                ) : holdingRows.length === 0 ? (
                  <p className="dhara-stf-note">No studio equipment is currently with this staff member.</p>
                ) : (
                  <ul className="dhara-stf-assign-list">
                    {holdingRows.map((row) => (
                      <li key={row.key} className="dhara-stf-booking-pick">
                        <p>
                          {row.equipmentName}
                          {row.equipmentCode ? ` (${row.equipmentCode})` : ''} × {row.remainingQuantity}
                        </p>
                        <span>
                          {row.bookingNumber} · {formatDate(row.issuedAt)} · {row.issueStatus}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <h3 className="dhara-stf-section-title">Equipment History</h3>
                {equipmentQuery.data ? (
                  <>
                    <div className="dhara-stf-facts">
                      {[
                        ['Total Issues', equipmentQuery.data.totalIssues],
                        ['Currently Holding', equipmentQuery.data.currentlyHolding],
                        ['Returned', equipmentQuery.data.returned],
                        ['Missing', equipmentQuery.data.missing],
                        ['Damaged', equipmentQuery.data.damaged],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="dhara-stf-fact">
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                    <ul className="dhara-stf-assign-list">
                      {equipmentQuery.data.issues.map((issue) => (
                        <li key={issue.id} className="dhara-stf-booking-pick">
                          <p>
                            {issue.issueNumber} · {issue.bookingNumber}
                          </p>
                          <span>{issue.status}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="dhara-stf-note">No equipment issues for this staff member.</p>
                )}
              </section>
            )}
          </>
        )}

        <div className="dhara-stf-form-actions">
          <button type="button" className="dhara-stf-btn" onClick={onClose}>
            Close
          </button>
          {staff && (
            <button type="button" className="dhara-stf-btn is-gold" onClick={() => onEdit(staff)}>
              Edit Staff
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

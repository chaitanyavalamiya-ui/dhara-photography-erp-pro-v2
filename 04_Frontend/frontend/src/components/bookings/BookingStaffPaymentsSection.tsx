import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Booking } from '@/services/bookings-service';
import { bookingOperationsService } from '@/services/booking-operations-service';
import { staffService } from '@/services/staff-service';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, formatDate } from '@/utils/booking-form';
import { cn } from '@/utils/cn';
import { invalidateAfterAccountsExpense } from '@/utils/invalidate-financial-queries';

interface BookingStaffPaymentsSectionProps {
  booking: Booking;
}

export function BookingStaffPaymentsSection({ booking }: BookingStaffPaymentsSectionProps) {
  const queryClient = useQueryClient();
  const canUpdate = useAuthStore((s) => s.hasPermission('bookings.update'));

  const [assignmentId, setAssignmentId] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'pending' | 'paid'>('paid');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState('cash');

  const teamQuery = useQuery({
    queryKey: ['bookings', booking.id, 'staff'],
    queryFn: () => staffService.listBookingTeam(booking.id),
  });

  const paymentsQuery = useQuery({
    queryKey: ['bookings', booking.id, 'staff-payments'],
    queryFn: () => bookingOperationsService.listStaffPayments(booking.id),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      bookingOperationsService.createStaffPayment(booking.id, assignmentId, {
        amount: Number(amount),
        status,
        paymentDate,
        paymentMode,
      }),
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'staff-payments'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'activities'] });
      if (payment.status === 'paid') {
        invalidateAfterAccountsExpense(queryClient);
      }
      setAmount('');
      setAssignmentId('');
    },
  });

  const payments = paymentsQuery.data ?? [];
  const team = teamQuery.data ?? [];

  return (
    <div className="space-y-4">
      {canUpdate && team.length > 0 && (
        <form
          className="grid gap-3 rounded-lg border border-gold/20 bg-surface p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (assignmentId && amount) createMutation.mutate();
          }}
        >
          <select
            className="input-field sm:col-span-2"
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
            required
          >
            <option value="">Select team member</option>
            {team.map((member) => (
              <option key={member.id} value={member.id}>
                {member.roleLabel} — {member.staffName}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            className="input-field"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <select
            className="input-field"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'pending' | 'paid')}
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
          <input
            type="date"
            className="input-field"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
          <select
            className="input-field"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
          <button type="submit" className="btn-primary sm:col-span-2" disabled={createMutation.isPending}>
            <Plus className="mr-1 h-4 w-4" />
            Record Payment
          </button>
        </form>
      )}

      {paymentsQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading payment history...</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-gray-500">No staff payments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-elevated text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Method</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 text-gray-100">{payment.staffName}</td>
                  <td className="px-4 py-3 text-gray-400">{payment.roleLabel}</td>
                  <td className="px-4 py-3 font-medium text-gold">{formatCurrency(payment.amount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs capitalize',
                        payment.status === 'paid'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-orange-500/10 text-orange-400',
                      )}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(payment.paymentDate)}</td>
                  <td className="px-4 py-3 text-gray-400">{payment.paymentMode ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

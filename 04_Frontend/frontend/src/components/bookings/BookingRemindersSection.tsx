import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Booking } from '@/services/bookings-service';
import { bookingOperationsService, REMINDER_TYPES } from '@/services/booking-operations-service';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/utils/booking-form';
import { cn } from '@/utils/cn';

interface BookingRemindersSectionProps {
  booking: Booking;
}

export function BookingRemindersSection({ booking }: BookingRemindersSectionProps) {
  const queryClient = useQueryClient();
  const canUpdate = useAuthStore((s) => s.hasPermission('bookings.update'));
  const [reminderType, setReminderType] = useState('other');
  const [reminderDate, setReminderDate] = useState('');
  const [note, setNote] = useState('');

  const remindersQuery = useQuery({
    queryKey: ['bookings', booking.id, 'reminders'],
    queryFn: () => bookingOperationsService.listReminders(booking.id),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      bookingOperationsService.createReminder(booking.id, {
        reminderType,
        reminderDate,
        note: note || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'reminders'] });
      setNote('');
      setReminderDate('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      bookingOperationsService.updateReminder(booking.id, id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'reminders'] });
    },
  });

  const reminders = remindersQuery.data ?? [];

  return (
    <div className="space-y-4">
      {canUpdate && (
        <form
          className="grid gap-3 rounded-lg border border-gold/20 bg-surface p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (reminderDate) createMutation.mutate();
          }}
        >
          <select
            className="input-field"
            value={reminderType}
            onChange={(e) => setReminderType(e.target.value)}
          >
            {REMINDER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input-field"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
            required
          />
          <input
            className="input-field sm:col-span-2"
            placeholder="Reminder note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" className="btn-primary sm:col-span-2" disabled={createMutation.isPending}>
            <Plus className="mr-1 h-4 w-4" />
            Add Reminder
          </button>
        </form>
      )}

      {remindersQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading reminders...</p>
      ) : reminders.length === 0 ? (
        <p className="text-sm text-gray-500">No reminders set.</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center justify-between rounded-lg border border-surface-border px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium capitalize text-gray-100">
                  {reminder.reminderType.replace('_', ' ')}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(reminder.reminderDate)}
                  {reminder.note ? ` · ${reminder.note}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    reminder.status === 'completed'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-gold/10 text-gold',
                  )}
                >
                  {reminder.status}
                </span>
                {canUpdate && reminder.status === 'active' && (
                  <button
                    type="button"
                    className="text-xs text-gray-400 hover:text-gold"
                    onClick={() => updateMutation.mutate({ id: reminder.id, status: 'completed' })}
                  >
                    Mark done
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

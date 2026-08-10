import { useQuery } from '@tanstack/react-query';
import { Booking } from '@/services/bookings-service';
import { bookingOperationsService } from '@/services/booking-operations-service';
import { formatDate } from '@/utils/booking-form';

interface BookingHistorySectionProps {
  booking: Booking;
}

export function BookingHistorySection({ booking }: BookingHistorySectionProps) {
  const activitiesQuery = useQuery({
    queryKey: ['bookings', booking.id, 'activities'],
    queryFn: () => bookingOperationsService.listActivities(booking.id),
  });

  if (activitiesQuery.isLoading) {
    return <p className="text-sm text-gray-500">Loading history...</p>;
  }

  if (activitiesQuery.isError) {
    return <p className="text-sm text-red-400">Failed to load activity history.</p>;
  }

  const activities = activitiesQuery.data ?? [];

  if (activities.length === 0) {
    return <p className="text-sm text-gray-500">No activity recorded yet.</p>;
  }

  return (
    <div className="relative space-y-4">
      <div className="absolute left-3 top-2 h-[calc(100%-1rem)] w-0.5 bg-surface-border" />
      {activities.map((activity) => (
        <div key={activity.id} className="relative pl-8">
          <span className="absolute left-1.5 top-2 h-3 w-3 rounded-full border-2 border-gold bg-surface-card" />
          <p className="text-xs text-gray-500">{formatDate(activity.occurredAt)}</p>
          <p className="mt-0.5 text-sm text-gray-200">{activity.message}</p>
        </div>
      ))}
    </div>
  );
}

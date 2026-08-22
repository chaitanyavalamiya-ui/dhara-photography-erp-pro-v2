import { Link } from 'react-router-dom';
import type { CalendarBookingEvent } from '@/services/bookings-service';
import { formatBookingTime } from './dashboard-format';
import { DashboardEmpty, DashboardSkeleton } from './DashboardEmpty';
import { QueryErrorPanel } from './QueryErrorPanel';

function statusClass(statusCode: string) {
  if (statusCode === 'confirmed' || statusCode === 'completed') return 'dhara-dash-badge is-ok';
  if (statusCode === 'enquiry' || statusCode === 'pending') return 'dhara-dash-badge is-warn';
  return 'dhara-dash-badge is-muted';
}

function statusLabel(statusCode: string, status: string) {
  if (statusCode === 'confirmed') return 'Confirmed';
  if (statusCode === 'completed') return 'Completed';
  if (statusCode === 'enquiry' || statusCode === 'pending') return 'Pending';
  if (statusCode === 'upcoming') return 'Upcoming';
  return status || 'Upcoming';
}

interface DashboardTodayBookingsProps {
  bookings?: CalendarBookingEvent[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

export function DashboardTodayBookings({
  bookings,
  loading,
  error,
  onRetry,
}: DashboardTodayBookingsProps) {
  return (
    <section className="dhara-dash-panel">
      <div className="dhara-dash-panel-head">
        <h3>Today&apos;s Bookings</h3>
        <Link to="/bookings" className="dhara-dash-link">
          View All Bookings
        </Link>
      </div>
      {loading ? (
        <DashboardSkeleton className="h-40" />
      ) : error ? (
        <QueryErrorPanel error={error} fallback="Failed to load today's bookings." onRetry={onRetry} />
      ) : !bookings?.length ? (
        <DashboardEmpty message="No bookings scheduled for today." />
      ) : (
        <div>
          {bookings.map((booking) => (
            <div key={booking.id} className="dhara-dash-row">
              <small>{formatBookingTime(booking.eventDate)}</small>
              <p>{booking.clientName}</p>
              <small>{booking.eventType}</small>
              <small>{booking.venue || '—'}</small>
              <span className={statusClass(booking.statusCode)}>
                {statusLabel(booking.statusCode, booking.status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

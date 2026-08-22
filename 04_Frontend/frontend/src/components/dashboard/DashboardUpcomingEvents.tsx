import { Link } from 'react-router-dom';
import type { PaginatedBookings } from '@/services/bookings-service';
import { formatEventDateBadge } from './dashboard-format';
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
  return status || 'Upcoming';
}

interface DashboardUpcomingEventsProps {
  bookings?: PaginatedBookings;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

export function DashboardUpcomingEvents({
  bookings,
  loading,
  error,
  onRetry,
}: DashboardUpcomingEventsProps) {
  return (
    <section className="dhara-dash-panel">
      <div className="dhara-dash-panel-head">
        <h3>Upcoming Events</h3>
        <Link to="/calendar" className="dhara-dash-link">
          Open calendar →
        </Link>
      </div>
      {loading ? (
        <DashboardSkeleton className="h-40" />
      ) : error ? (
        <QueryErrorPanel error={error} fallback="Failed to load upcoming events." onRetry={onRetry} />
      ) : !bookings?.items.length ? (
        <DashboardEmpty message="No upcoming bookings scheduled." />
      ) : (
        <div className="dhara-dash-timeline">
          {bookings.items.map((booking) => (
            <div key={booking.id} className="dhara-dash-event">
              <span className="dhara-dash-date">{formatEventDateBadge(booking.eventDate)}</span>
              <div>
                <p className="m-0 font-medium" style={{ color: '#fff8ee', fontSize: '1.05rem' }}>
                  {booking.client?.fullName ?? booking.bookingNumber}
                </p>
                <small>
                  {booking.eventType}
                  {booking.venue ? ` · ${booking.venue}` : ''}
                </small>
              </div>
              <span className={statusClass(booking.statusCode ?? '')}>
                {statusLabel(booking.statusCode ?? '', booking.status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

import { STUDIO_TIME_ZONE } from '@/utils/studio-date';

export function studioGreeting(now = new Date()): 'Good Morning' | 'Good Afternoon' | 'Good Evening' {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: STUDIO_TIME_ZONE,
      hour: 'numeric',
      hour12: false,
    }).format(now),
  );
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function formatStudioLongDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: STUDIO_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
}

export function formatEventDateBadge(eventDate?: string | null): string {
  if (!eventDate) return '—';
  const date = new Date(eventDate.includes('T') ? eventDate : `${eventDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: STUDIO_TIME_ZONE,
    day: '2-digit',
    month: 'short',
  })
    .format(date)
    .toUpperCase();
}

export function formatBookingTime(eventDate?: string | null): string {
  if (!eventDate) return 'All day';
  if (!eventDate.includes('T')) return 'All day';
  const date = new Date(eventDate);
  if (Number.isNaN(date.getTime())) return 'All day';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: STUDIO_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

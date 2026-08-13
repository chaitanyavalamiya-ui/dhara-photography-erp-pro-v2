export const ROBO_TOOL_NAMES = [
  'get_today_bookings',
  'get_bookings_for_range',
  'get_accounts_dashboard',
  'get_period_summary',
  'get_reports_dashboard',
  'search_clients',
  'get_upcoming_events',
  'list_invoices',
  'list_galleries',
  'list_albums',
] as const;

export type RoboToolName = (typeof ROBO_TOOL_NAMES)[number];

export const ROBO_TOOL_PERMISSIONS: Record<RoboToolName, string> = {
  get_today_bookings: 'bookings.read',
  get_bookings_for_range: 'bookings.read',
  get_accounts_dashboard: 'accounts.read',
  get_period_summary: 'accounts.read',
  get_reports_dashboard: 'reports.read',
  search_clients: 'clients.read',
  get_upcoming_events: 'clients.read',
  list_invoices: 'invoices.read',
  list_galleries: 'gallery.read',
  list_albums: 'album.read',
};

export function isRoboToolName(value: string): value is RoboToolName {
  return (ROBO_TOOL_NAMES as readonly string[]).includes(value);
}

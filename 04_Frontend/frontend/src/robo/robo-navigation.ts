import { clampRoboPoint, type RoboPoint, type RoboSize } from './robo-interaction';
import type { RoboPosition } from './robo-positions';

export interface RoboNavTarget {
  id: string;
  target: string;
  route: string;
  position: RoboPosition;
}

export const ROBO_NAV_TARGETS: RoboNavTarget[] = [
  { id: 'dashboard', target: 'dashboard-nav', route: '/dashboard', position: 'center-left' },
  { id: 'bookings', target: 'booking-nav', route: '/bookings', position: 'center-left' },
  { id: 'today-bookings', target: 'today-bookings', route: '/dashboard', position: 'center-right' },
  { id: 'clients', target: 'clients-nav', route: '/clients', position: 'center-left' },
  { id: 'calendar', target: 'calendar-nav', route: '/calendar', position: 'center-left' },
  { id: 'gallery', target: 'gallery-nav', route: '/gallery', position: 'center-left' },
  { id: 'invoices', target: 'invoice-nav', route: '/invoices', position: 'center-left' },
  { id: 'accounts', target: 'accounts-nav', route: '/accounts', position: 'center-left' },
  { id: 'expenses', target: 'expenses-nav', route: '/expenses', position: 'center-left' },
  { id: 'add-expense', target: 'add-expense', route: '/expenses', position: 'top-right' },
  { id: 'delivery', target: 'delivery-nav', route: '/deliveries', position: 'center-left' },
  { id: 'reports', target: 'reports-nav', route: '/reports', position: 'center-left' },
  { id: 'settings', target: 'settings-nav', route: '/settings', position: 'center-left' },
  {
    id: 'backup',
    target: 'backup-nav',
    route: '/settings?tab=backup-restore',
    position: 'center-left',
  },
  { id: 'add-booking', target: 'add-booking', route: '/bookings', position: 'top-right' },
  { id: 'add-client', target: 'add-client', route: '/clients', position: 'top-right' },
  { id: 'add-invoice', target: 'add-invoice', route: '/invoices', position: 'top-right' },
];

export function findRoboNavTarget(idOrTarget: string): RoboNavTarget | undefined {
  const value = idOrTarget.trim().toLowerCase();
  return ROBO_NAV_TARGETS.find((item) => item.id === value || item.target === value);
}

export function queryRoboTarget(target: string, root: ParentNode = document): Element | null {
  if (!target) return null;
  return root.querySelector(`[data-robo-target="${target}"]`);
}

/** Park beside a semantic ERP element instead of using hardcoded screen coordinates. */
export function parkPointForElement(
  box: { left: number; right: number; top: number; bottom: number; width: number; height: number },
  size: RoboSize,
  viewportWidth: number,
  viewportHeight: number,
): RoboPoint {
  const sidebar = box.right < 320;
  const point = sidebar
    ? { x: box.right + 12, y: box.top + box.height / 2 - size.height * 0.62 }
    : { x: box.right - Math.min(72, box.width * 0.15), y: box.bottom - size.height * 0.55 };
  return clampRoboPoint(point, size, viewportWidth, viewportHeight);
}

export function travelStep(
  from: RoboPoint,
  to: RoboPoint,
  speedPxPerSec: number,
  dtSec: number,
): RoboPoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(0, speedPxPerSec) * Math.max(0, dtSec);
  if (dist <= step || dist < 0.5) return { x: to.x, y: to.y };
  const t = step / dist;
  return { x: from.x + dx * t, y: from.y + dy * t };
}

export function facingToward(from: RoboPoint, to: RoboPoint, size: RoboSize): number {
  const originX = from.x + size.width / 2;
  const originY = from.y + size.height * 0.55;
  const yaw = Math.atan2(to.x - originX, originY - to.y);
  return Math.max(-0.42, Math.min(0.42, yaw));
}

export const ROBO_WALK_SPEED_PX = 340;

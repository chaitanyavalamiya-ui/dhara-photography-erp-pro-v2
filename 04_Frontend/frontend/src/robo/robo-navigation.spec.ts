import { describe, expect, it } from 'vitest';
import {
  facingToward,
  findRoboNavTarget,
  parkPointForElement,
  queryRoboTarget,
  travelStep,
} from './robo-navigation';

describe('robo navigation', () => {
  it('resolves semantic ERP destinations, not raw coordinates', () => {
    expect(findRoboNavTarget('bookings')).toMatchObject({ target: 'booking-nav', route: '/bookings' });
    expect(findRoboNavTarget('clients-nav')).toMatchObject({ id: 'clients', route: '/clients' });
    expect(findRoboNavTarget('calendar')).toMatchObject({ target: 'calendar-nav' });
    expect(findRoboNavTarget('missing')).toBeUndefined();
  });

  it('parks beside a sidebar target instead of covering it', () => {
    const parked = parkPointForElement(
      { left: 8, right: 240, top: 200, bottom: 244, width: 232, height: 44 },
      { width: 240, height: 320 },
      1280,
      800,
    );
    expect(parked.x).toBeGreaterThan(240);
  });

  it('moves at a steady walk speed instead of teleporting', () => {
    const from = { x: 1000, y: 600 };
    const to = { x: 40, y: 400 };
    const stepped = travelStep(from, to, 340, 0.1);
    expect(stepped.x).toBeLessThan(from.x);
    expect(stepped.x).toBeGreaterThan(to.x);
    expect(travelStep(from, from, 340, 0.1)).toEqual(from);
  });

  it('faces toward the destination with a modest yaw', () => {
    const yaw = facingToward({ x: 900, y: 500 }, { x: 40, y: 200 }, { width: 240, height: 320 });
    expect(yaw).toBeLessThan(0);
    expect(Math.abs(yaw)).toBeLessThanOrEqual(0.42);
  });

  it('finds data-robo-target nodes', () => {
    const root = document.createElement('div');
    root.innerHTML = '<nav data-robo-target="booking-nav">Bookings</nav>';
    expect(queryRoboTarget('booking-nav', root)?.textContent).toBe('Bookings');
  });
});

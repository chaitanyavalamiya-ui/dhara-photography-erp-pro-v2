import { describe, expect, it } from 'vitest';
import { firstOfMonthIso, todayIso } from './studio-date';

describe('studio-date', () => {
  it('uses Asia/Kolkata instead of UTC for today and month start', () => {
    const lateUtc = new Date('2026-08-16T20:00:00.000Z');

    expect(todayIso(lateUtc)).toBe('2026-08-17');
    expect(firstOfMonthIso(lateUtc)).toBe('2026-08-01');
  });
});

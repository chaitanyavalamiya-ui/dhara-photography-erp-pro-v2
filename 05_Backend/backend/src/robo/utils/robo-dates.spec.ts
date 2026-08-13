import { detectRoboDatePreset, resolveRoboDateRange, toIsoDate } from './robo-dates';

describe('robo-dates', () => {
  const now = new Date(2026, 7, 13);

  it('resolves today, tomorrow, and this month', () => {
    expect(resolveRoboDateRange('today', now)).toEqual({ dateFrom: '2026-08-13', dateTo: '2026-08-13' });
    expect(resolveRoboDateRange('tomorrow', now)).toEqual({ dateFrom: '2026-08-14', dateTo: '2026-08-14' });
    expect(resolveRoboDateRange('this_month', now).dateFrom).toBe('2026-08-01');
    expect(toIsoDate(now)).toBe('2026-08-13');
  });

  it('detects Gujarati, Hindi, and English date words', () => {
    expect(detectRoboDatePreset('આજે કેટલા booking છે?')).toBe('today');
    expect(detectRoboDatePreset('आज कितनी booking हैं?')).toBe('today');
    expect(detectRoboDatePreset('How many bookings tomorrow?')).toBe('tomorrow');
    expect(detectRoboDatePreset('this month bookings')).toBe('this_month');
  });
});

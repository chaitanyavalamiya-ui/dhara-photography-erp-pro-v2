export const STUDIO_TIME_ZONE = 'Asia/Kolkata';

export function getStudioDateParts(now = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);

  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function todayIso(now = new Date()): string {
  const { year, month, day } = getStudioDateParts(now);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function firstOfMonthIso(now = new Date()): string {
  const { year, month } = getStudioDateParts(now);
  return `${year}-${pad(month)}-01`;
}

export type RoboDatePreset =
  | 'today'
  | 'tomorrow'
  | 'yesterday'
  | 'this_week'
  | 'next_week'
  | 'this_month'
  | 'next_month';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfWeek(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function resolveRoboDateRange(
  preset: RoboDatePreset,
  now = new Date(),
): { dateFrom: string; dateTo: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === 'today') {
    const iso = toIsoDate(today);
    return { dateFrom: iso, dateTo: iso };
  }
  if (preset === 'tomorrow') {
    const next = new Date(today);
    next.setDate(today.getDate() + 1);
    const iso = toIsoDate(next);
    return { dateFrom: iso, dateTo: iso };
  }
  if (preset === 'yesterday') {
    const prev = new Date(today);
    prev.setDate(today.getDate() - 1);
    const iso = toIsoDate(prev);
    return { dateFrom: iso, dateTo: iso };
  }
  if (preset === 'this_week') {
    const start = startOfWeek(today);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
  }
  if (preset === 'next_week') {
    const start = startOfWeek(today);
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
  }
  if (preset === 'next_month') {
    const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
}

export function detectRoboDatePreset(text: string): RoboDatePreset | null {
  const value = text.toLowerCase();
  if (/tomorrow|આવતીકાલે|कल(?! )/.test(value) || value.includes('कल ')) return 'tomorrow';
  if (/yesterday|ગઈકાલે|कल(?=.*थी)|बीते/.test(value) || /yesterday/.test(value)) return 'yesterday';
  if (/next week|આવતા અઠવાડિયે|अगले हफ्ते/.test(value)) return 'next_week';
  if (/this week|આ અઠવાડિયે|इस हफ्ते/.test(value)) return 'this_week';
  if (/next month|આવતા મહિને|अगले महीने/.test(value)) return 'next_month';
  if (/this month|આ મહિને|इस महीने/.test(value)) return 'this_month';
  if (/today|આજે|आज/.test(value)) return 'today';
  return null;
}

export function parseIsoDateFromText(text: string): string | null {
  const match = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return match?.[1] ?? null;
}

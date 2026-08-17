export type LedgerSortKey = {
  id: string;
  date: string | Date;
  createdAt: string | Date;
  type: 'income' | 'expense';
};

function toTime(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function compareLedgerNewestFirst(a: LedgerSortKey, b: LedgerSortKey): number {
  const byDate = toTime(b.date) - toTime(a.date);
  if (byDate !== 0) {
    return byDate;
  }

  const byCreated = toTime(b.createdAt) - toTime(a.createdAt);
  if (byCreated !== 0) {
    return byCreated;
  }

  if (a.type !== b.type) {
    return a.type === 'income' ? -1 : 1;
  }

  return b.id.localeCompare(a.id);
}

export function sortLedgerNewestFirst<T extends LedgerSortKey>(entries: T[]): T[] {
  return [...entries].sort(compareLedgerNewestFirst);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Period opening is 0. Each chronological row is previous + income − expense. */
export function computeNewestFirstRunningBalances(
  entries: Array<{ income: number; expense: number }>,
): number[] {
  const balances = new Array<number>(entries.length);
  let previous = 0;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    previous = roundMoney(previous + entry.income - entry.expense);
    balances[index] = previous;
  }

  return balances;
}

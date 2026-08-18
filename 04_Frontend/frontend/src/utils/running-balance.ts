export type LedgerSortKey = {
  id: string;
  date: string | Date;
  createdAt?: string | Date;
  type: 'income' | 'expense';
};

function toTime(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function optionalTime(value?: string | Date): number | null {
  if (value == null || value === '') {
    return null;
  }
  const time = toTime(value);
  return Number.isNaN(time) ? null : time;
}

export function compareLedgerNewestFirst(a: LedgerSortKey, b: LedgerSortKey): number {
  const byDate = toTime(b.date) - toTime(a.date);
  if (byDate !== 0) {
    return byDate;
  }

  const aCreated = optionalTime(a.createdAt);
  const bCreated = optionalTime(b.createdAt);
  if (aCreated != null && bCreated != null) {
    const byCreated = bCreated - aCreated;
    if (byCreated !== 0) {
      return byCreated;
    }
  }

  if (a.type !== b.type) {
    return a.type === 'income' ? -1 : 1;
  }

  return b.id.localeCompare(a.id);
}

export function sortLedgerNewestFirst<T extends LedgerSortKey>(entries: T[]): T[] {
  return [...entries].sort(compareLedgerNewestFirst);
}

export function compareLedgerOldestFirst(a: LedgerSortKey, b: LedgerSortKey): number {
  return compareLedgerNewestFirst(b, a);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function ledgerAmount(value: number): number {
  return Number(value) || 0;
}

/** Period opening is 0. Each chronological row is previous + income − expense. */
export function computeNewestFirstRunningBalances(
  entries: Array<{ income: number; expense: number }>,
): number[] {
  const balances = new Array<number>(entries.length);
  let previous = 0;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    previous = roundMoney(previous + ledgerAmount(entry.income) - ledgerAmount(entry.expense));
    balances[index] = previous;
  }

  return balances;
}

/**
 * Sort oldest → newest, apply previous + income − expense from 0,
 * then return balances in the original display order.
 */
export function attachChronologicalRunningBalances<
  T extends LedgerSortKey & { income: number; expense: number },
>(displayEntries: T[]): number[] {
  if (displayEntries.length === 0) {
    return [];
  }

  const ordered = displayEntries.map((entry, displayIndex) => ({ entry, displayIndex }));
  ordered.sort((a, b) => {
    const byChronology = compareLedgerOldestFirst(a.entry, b.entry);
    return byChronology !== 0 ? byChronology : a.displayIndex - b.displayIndex;
  });

  const balances = new Array<number>(displayEntries.length);
  let previous = 0;

  for (const { entry, displayIndex } of ordered) {
    previous = roundMoney(previous + ledgerAmount(entry.income) - ledgerAmount(entry.expense));
    balances[displayIndex] = previous;
  }

  return balances;
}

export function withLedgerRunningBalances<
  T extends LedgerSortKey & { income: number; expense: number },
>(items: T[]): Array<T & { runningBalance: number }> {
  const runningBalances = attachChronologicalRunningBalances(items);
  return items.map((item, index) => ({
    ...item,
    runningBalance: runningBalances[index] ?? 0,
  }));
}

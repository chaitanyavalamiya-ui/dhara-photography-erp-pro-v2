import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  BookImage,
  BookOpen,
  CalendarRange,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  REPORT_DATE_PRESETS,
  ReportDatePreset,
  reportsService,
} from '@/services/reports-service';
import { formatCurrency } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

type ReportTab = 'overview' | 'bookings' | 'payments' | 'expenses' | 'profit' | 'monthly';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('overview');
  const [preset, setPreset] = useState<ReportDatePreset>('this_month');
  const [dateFrom, setDateFrom] = useState(firstOfMonthIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [applied, setApplied] = useState({
    preset: 'this_month' as ReportDatePreset,
    dateFrom: firstOfMonthIso(),
    dateTo: todayIso(),
  });
  const [filterError, setFilterError] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    if (applied.preset === 'custom') {
      return { preset: applied.preset, dateFrom: applied.dateFrom, dateTo: applied.dateTo };
    }
    return { preset: applied.preset };
  }, [applied]);

  const applyFilters = (nextPreset = preset, nextFrom = dateFrom, nextTo = dateTo) => {
    if (nextPreset === 'custom') {
      if (!nextFrom || !nextTo) {
        setFilterError('Custom range requires both start and end dates.');
        return;
      }
      if (nextFrom > nextTo) {
        setFilterError('Start date must be on or before end date.');
        return;
      }
    }

    setFilterError(null);
    setApplied({
      preset: nextPreset,
      dateFrom: nextFrom,
      dateTo: nextTo,
    });
  };

  const selectPreset = (value: ReportDatePreset) => {
    setPreset(value);
    if (value !== 'custom') {
      applyFilters(value, dateFrom, dateTo);
    }
  };

  const overviewQuery = useQuery({
    queryKey: ['reports', 'overview', queryParams],
    queryFn: () => reportsService.getOverview(queryParams),
    enabled: tab === 'overview',
  });

  const bookingsQuery = useQuery({
    queryKey: ['reports', 'bookings', queryParams],
    queryFn: () => reportsService.getBookingReport(queryParams),
    enabled: tab === 'bookings',
  });

  const paymentsQuery = useQuery({
    queryKey: ['reports', 'payments', queryParams],
    queryFn: () => reportsService.getPaymentReport(queryParams),
    enabled: tab === 'payments',
  });

  const expensesQuery = useQuery({
    queryKey: ['reports', 'expenses', queryParams],
    queryFn: () => reportsService.getExpenseReport(queryParams),
    enabled: tab === 'expenses',
  });

  const profitQuery = useQuery({
    queryKey: ['reports', 'profit', queryParams],
    queryFn: () => reportsService.getProfitReport(queryParams),
    enabled: tab === 'profit',
  });

  const monthlyQuery = useQuery({
    queryKey: ['reports', 'monthly-summary'],
    queryFn: () => reportsService.getMonthlySummary(12),
    enabled: tab === 'monthly',
  });

  const overview = overviewQuery.data;
  const overviewCards = overview
    ? [
        { label: 'Booking Value', value: overview.totalBookingValue, icon: BookOpen, color: 'text-gold' },
        { label: 'Invoice Value', value: overview.totalInvoiceValue, icon: TrendingUp, color: 'text-gold' },
        { label: 'Amount Received', value: overview.amountReceived, icon: ArrowDownLeft, color: 'text-green-400' },
        { label: 'Outstanding', value: overview.outstandingAmount, icon: Wallet, color: 'text-orange-400' },
        { label: 'Total Expenses', value: overview.totalExpenses, icon: ArrowUpRight, color: 'text-red-400' },
        { label: 'Net Profit', value: overview.netProfit, icon: TrendingUp, color: 'text-gold' },
        { label: 'Album Sales', value: overview.albumSales, icon: BookImage, color: 'text-gold' },
        { label: 'Album Vendor Expense', value: overview.albumVendorExpenses, icon: TrendingDown, color: 'text-red-400' },
        { label: 'Album Profit', value: overview.albumProfit, icon: TrendingUp, color: 'text-green-400' },
      ]
    : [];

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'payments', label: 'Payments' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'profit', label: 'Profit' },
    { id: 'monthly', label: 'Monthly' },
  ];

  const periodLabel =
    overview?.period.label ??
    bookingsQuery.data?.period.label ??
    paymentsQuery.data?.period.label ??
    expensesQuery.data?.period.label ??
    profitQuery.data?.period.label;

  const activeError =
    (tab === 'overview' && overviewQuery.error) ||
    (tab === 'bookings' && bookingsQuery.error) ||
    (tab === 'payments' && paymentsQuery.error) ||
    (tab === 'expenses' && expensesQuery.error) ||
    (tab === 'profit' && profitQuery.error) ||
    (tab === 'monthly' && monthlyQuery.error);

  const isLoading =
    (tab === 'overview' && overviewQuery.isLoading) ||
    (tab === 'bookings' && bookingsQuery.isLoading) ||
    (tab === 'payments' && paymentsQuery.isLoading) ||
    (tab === 'expenses' && expensesQuery.isLoading) ||
    (tab === 'profit' && profitQuery.isLoading) ||
    (tab === 'monthly' && monthlyQuery.isLoading);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gold">Reports</h1>
          <p className="text-sm text-gray-400">
            Studio business intelligence — bookings, payments, expenses and profitability
          </p>
          {periodLabel && tab !== 'monthly' && (
            <p className="mt-1 text-xs text-gray-500">
              <CalendarRange className="mr-1 inline h-3.5 w-3.5" />
              Period: {periodLabel}
            </p>
          )}
        </div>
      </div>

      {tab !== 'monthly' && (
        <div className="card space-y-4">
          <div className="flex flex-wrap gap-2">
            {REPORT_DATE_PRESETS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  preset === item.value
                    ? 'bg-gold/15 text-gold ring-1 ring-gold/30'
                    : 'bg-surface-elevated text-gray-400 hover:text-gray-200',
                )}
                onClick={() => selectPreset(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs text-gray-500">From</label>
                <input
                  type="date"
                  className="input-field"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-500">To</label>
                <input
                  type="date"
                  className="input-field"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <button type="button" className="btn-primary" onClick={() => applyFilters()}>
              Apply Filters
            </button>
          </div>

          {filterError && (
            <p className="text-sm text-red-400">{filterError}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-surface-border pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              'rounded-t-lg px-4 py-2 text-sm font-medium transition',
              tab === item.id ? 'bg-gold/15 text-gold' : 'text-gray-500 hover:text-gray-300',
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeError && (
        <div className="card border-red-500/30 text-red-400">
          {getApiErrorMessage(activeError, 'Failed to load report data.')}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-surface-elevated" />
          ))}
        </div>
      ) : (
        <>
          {tab === 'overview' && overview && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {overviewCards.map((card) => (
                <div key={card.label} className="card border-gold/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wider text-gray-500">{card.label}</p>
                    <card.icon className={cn('h-4 w-4', card.color)} />
                  </div>
                  <p className={cn('mt-2 font-display text-xl font-bold', card.color)}>
                    {formatCurrency(card.value)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === 'bookings' && (
            <ReportTable
              emptyMessage="No bookings found for this period."
              headers={['Booking', 'Client', 'Event Date', 'Total', 'Received', 'Outstanding', 'Expenses', 'Profit']}
              rows={(bookingsQuery.data?.items ?? []).map((row) => [
                row.bookingNumber,
                row.clientName,
                row.eventDate ?? '—',
                formatCurrency(row.totalAmount),
                formatCurrency(row.received),
                formatCurrency(row.outstanding),
                formatCurrency(row.expenses),
                formatCurrency(row.profit),
              ])}
            />
          )}

          {tab === 'payments' && (
            <ReportTable
              emptyMessage="No payments found for this period."
              headers={['Date', 'Receipt', 'Invoice', 'Client', 'Method', 'Amount']}
              rows={(paymentsQuery.data?.items ?? []).map((row) => [
                row.paymentDate,
                row.receiptNumber ?? '—',
                row.invoiceNumber ?? '—',
                row.clientName,
                row.paymentMethod,
                formatCurrency(row.amount),
              ])}
            />
          )}

          {tab === 'expenses' && (
            <ReportTable
              emptyMessage="No expenses found for this period."
              headers={['Date', 'Expense #', 'Category', 'Description', 'Booking', 'Album', 'Amount']}
              rows={(expensesQuery.data?.items ?? []).map((row) => [
                row.expenseDate,
                row.expenseNumber,
                row.category,
                row.description ?? '—',
                row.bookingNumber ?? '—',
                row.albumName ?? '—',
                formatCurrency(row.amount),
              ])}
            />
          )}

          {tab === 'profit' && profitQuery.data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Revenue (Invoices)', value: profitQuery.data.revenue, color: 'text-gold' },
                { label: 'Received', value: profitQuery.data.received, color: 'text-green-400' },
                { label: 'Expenses', value: profitQuery.data.expenses, color: 'text-red-400' },
                { label: 'Profit', value: profitQuery.data.profit, color: 'text-gold' },
                { label: 'Profit %', value: `${profitQuery.data.profitPercent}%`, color: 'text-green-400', isText: true },
              ].map((card) => (
                <div key={card.label} className="card border-gold/10 p-5">
                  <p className="text-xs uppercase tracking-wider text-gray-500">{card.label}</p>
                  <p className={cn('mt-2 font-display text-2xl font-bold', card.color)}>
                    {'isText' in card && card.isText ? card.value : formatCurrency(card.value as number)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === 'profit' && !profitQuery.data && !activeError && (
            <div className="card flex min-h-48 flex-col items-center justify-center text-center">
              <BarChart3 className="h-12 w-12 text-gray-600" />
              <p className="mt-3 text-gray-400">No profit data for the selected period.</p>
            </div>
          )}

          {tab === 'monthly' && (
            <ReportTable
              emptyMessage="No monthly data available."
              headers={['Month', 'Revenue', 'Received', 'Expenses', 'Profit', 'Bookings']}
              rows={(monthlyQuery.data ?? []).map((row) => [
                row.label,
                formatCurrency(row.revenue),
                formatCurrency(row.received),
                formatCurrency(row.expenses),
                formatCurrency(row.profit),
                String(row.bookingsCount),
              ])}
            />
          )}
        </>
      )}

      {!isLoading && !activeError && tab === 'overview' && !overview && (
        <div className="card flex min-h-48 flex-col items-center justify-center text-center">
          <BarChart3 className="h-12 w-12 text-gray-600" />
          <p className="mt-3 text-gray-400">No overview data for the selected period.</p>
        </div>
      )}
    </div>
  );
}

function ReportTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: string[][];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="card flex min-h-48 flex-col items-center justify-center text-center">
        <BarChart3 className="h-12 w-12 text-gray-600" />
        <p className="mt-3 text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
            {headers.map((header) => (
              <th key={header} className="px-3 py-3 whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-surface-border/60 text-gray-300">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-3 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

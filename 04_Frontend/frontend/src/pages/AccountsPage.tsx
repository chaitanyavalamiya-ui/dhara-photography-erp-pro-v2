import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookImage,
  CalendarRange,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  UserCog,
  Wallet,
} from 'lucide-react';
import {
  ACCOUNTS_DATE_PRESETS,
  AccountsDatePreset,
  accountsService,
} from '@/services/accounts-service';
import { paymentsService, Payment } from '@/services/payments-service';
import { invoicesService } from '@/services/invoices-service';
import { expensesService, Expense, isSystemLinkedExpense, getExpenseSourceLabel, getExpenseSource } from '@/services/expenses-service';
import { bookingsService } from '@/services/bookings-service';
import { useAuthStore } from '@/stores/auth-store';
import { AddPaymentModal } from '@/components/accounts/AddPaymentModal';
import { AddExpenseModal } from '@/components/accounts/AddExpenseModal';
import { ExpenseViewModal } from '@/components/accounts/ExpenseViewModal';
import { ArchiveExpenseDialog } from '@/components/accounts/ArchiveExpenseDialog';
import { PaymentReceiptModal } from '@/components/accounts/PaymentReceiptModal';
import { formatCurrency } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

type Tab =
  | 'overview'
  | 'income'
  | 'expenses'
  | 'staff'
  | 'profit'
  | 'monthly'
  | 'transactions';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Wallet className="mb-3 h-10 w-10 text-gray-600" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-6 text-center text-sm text-red-400">
      {message}
    </div>
  );
}

function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-elevated" />
      ))}
    </div>
  );
}

export function AccountsPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreatePayment = hasPermission('payments.create');
  const canCreateExpense = hasPermission('expenses.create');
  const canUpdateExpense = hasPermission('expenses.update');

  useQuery({
    queryKey: ['invoices', 'payment-select'],
    queryFn: () => invoicesService.list({ limit: 100, status: 'all' }),
    enabled: canCreatePayment,
  });

  const [tab, setTab] = useState<Tab>('overview');
  const [preset, setPreset] = useState<AccountsDatePreset>('this_month');
  const [dateFrom, setDateFrom] = useState(firstOfMonthIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [applied, setApplied] = useState({
    preset: 'this_month' as AccountsDatePreset,
    dateFrom: firstOfMonthIso(),
    dateTo: todayIso(),
  });
  const [filterError, setFilterError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [txnType, setTxnType] = useState<'all' | 'income' | 'expense'>('all');

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseModalMode, setExpenseModalMode] = useState<'create' | 'edit'>('create');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [archiveExpense, setArchiveExpense] = useState<Expense | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [profitBookingId, setProfitBookingId] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const dateParams = useMemo(() => {
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
    setApplied({ preset: nextPreset, dateFrom: nextFrom, dateTo: nextTo });
  };

  const selectPreset = (value: AccountsDatePreset) => {
    setPreset(value);
    if (value !== 'custom') {
      applyFilters(value, dateFrom, dateTo);
    }
  };

  const dashboardQuery = useQuery({
    queryKey: ['accounts', 'dashboard'],
    queryFn: accountsService.getDashboard,
  });

  const summaryQuery = useQuery({
    queryKey: ['accounts', 'summary', dateParams],
    queryFn: () => accountsService.getPeriodSummary(dateParams),
  });

  const expenseDateFilter = useMemo(() => {
    if (applied.preset === 'custom') {
      return { dateFrom: applied.dateFrom, dateTo: applied.dateTo };
    }
    if (summaryQuery.data?.period) {
      return {
        dateFrom: summaryQuery.data.period.dateFrom,
        dateTo: summaryQuery.data.period.dateTo,
      };
    }
    return {};
  }, [applied, summaryQuery.data]);

  const incomeQuery = useQuery({
    queryKey: ['accounts', 'income', dateParams, search, tab],
    queryFn: () =>
      accountsService.getIncome({
        ...dateParams,
        search: search || undefined,
        limit: tab === 'overview' ? 5 : 20,
      }),
    enabled: tab === 'income' || tab === 'overview',
  });

  const expenseBreakdownQuery = useQuery({
    queryKey: ['accounts', 'expense-breakdown', dateParams],
    queryFn: () => accountsService.getExpenseBreakdown(dateParams),
    enabled: tab === 'expenses',
  });

  const expensesListQuery = useQuery({
    queryKey: ['expenses', expenseDateFilter, search],
    queryFn: () =>
      expensesService.list({
        limit: 30,
        ...expenseDateFilter,
        search: search || undefined,
      }),
    enabled: tab === 'expenses' && Boolean(expenseDateFilter.dateFrom),
  });

  const staffQuery = useQuery({
    queryKey: ['accounts', 'staff-payments', dateParams, search],
    queryFn: () => accountsService.getStaffPayments({ ...dateParams, search: search || undefined }),
    enabled: tab === 'staff',
  });

  const profitQuery = useQuery({
    queryKey: ['accounts', 'profit-loss', dateParams],
    queryFn: () => accountsService.getProfitLoss(dateParams),
    enabled: tab === 'profit',
  });

  const monthlyQuery = useQuery({
    queryKey: ['accounts', 'monthly-summary'],
    queryFn: () => accountsService.getMonthlySummary(12),
    enabled: tab === 'monthly',
  });

  const transactionsQuery = useQuery({
    queryKey: ['accounts', 'transactions', dateParams, search, txnType],
    queryFn: () =>
      accountsService.getTransactions({
        ...dateParams,
        search: search || undefined,
        type: txnType,
        limit: 50,
      }),
    enabled: tab === 'transactions',
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'profit-select'],
    queryFn: () => bookingsService.list({ limit: 20 }),
    enabled: tab === 'overview',
  });

  const bookingProfitQuery = useQuery({
    queryKey: ['accounts', 'profit', profitBookingId],
    queryFn: () => accountsService.getBookingProfit(profitBookingId),
    enabled: Boolean(profitBookingId),
  });

  const paymentMutation = useMutation({
    mutationFn: paymentsService.create,
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'payment-select'] });
      setPaymentOpen(false);
      setReceiptPayment(payment);
      setFeedback({ type: 'success', message: 'Payment recorded successfully.' });
    },
    onError: (e: unknown) =>
      setFeedback({ type: 'error', message: getApiErrorMessage(e, 'Failed to record payment.') }),
  });

  const expenseMutation = useMutation({
    mutationFn: expensesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setExpenseOpen(false);
      setSelectedExpense(null);
      setFeedback({ type: 'success', message: 'Expense recorded successfully.' });
    },
    onError: (e: unknown) =>
      setFeedback({ type: 'error', message: getApiErrorMessage(e, 'Failed to record expense.') }),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof expensesService.update>[1] }) =>
      expensesService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setExpenseOpen(false);
      setSelectedExpense(null);
      setViewExpense(null);
      setFeedback({ type: 'success', message: 'Expense updated successfully.' });
    },
    onError: (e: unknown) =>
      setFeedback({ type: 'error', message: getApiErrorMessage(e, 'Failed to update expense.') }),
  });

  const archiveExpenseMutation = useMutation({
    mutationFn: expensesService.archive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setArchiveExpense(null);
      setViewExpense(null);
      setFeedback({ type: 'success', message: 'Expense archived successfully.' });
    },
    onError: (e: unknown) =>
      setFeedback({ type: 'error', message: getApiErrorMessage(e, 'Failed to archive expense.') }),
  });

  const openCreateExpense = () => {
    setExpenseModalMode('create');
    setSelectedExpense(null);
    setExpenseOpen(true);
  };

  const openEditExpense = (expense: Expense) => {
    if (isSystemLinkedExpense(expense)) {
      setViewExpense(expense);
      return;
    }
    setExpenseModalMode('edit');
    setSelectedExpense(expense);
    setExpenseOpen(true);
  };

  const openArchiveExpense = (expense: Expense) => {
    if (isSystemLinkedExpense(expense)) {
      setFeedback({
        type: 'error',
        message: 'System-linked expenses cannot be archived here. Update or remove them from the booking or album record.',
      });
      return;
    }
    setArchiveExpense(expense);
  };

  const buildExpensePayload = (values: {
    categoryCode: string;
    amount: number;
    expenseDate: string;
    description?: string;
    vendorPerson?: string;
    paymentModeCode?: string;
    referenceNumber?: string;
    bookingId?: string;
    notes?: string;
  }) => ({
    categoryCode: values.categoryCode,
    amount: values.amount,
    expenseDate: values.expenseDate,
    description: values.description || undefined,
    vendorPerson: values.vendorPerson || undefined,
    paymentModeCode: values.paymentModeCode || undefined,
    referenceNumber: values.referenceNumber || undefined,
    bookingId: values.bookingId || undefined,
    notes: values.notes || undefined,
  });

  const dash = dashboardQuery.data;
  const period = summaryQuery.data;

  const allTimeCards = dash
    ? [
        { label: 'Total Invoice Value', value: dash.totalRevenue, icon: TrendingUp, color: 'text-gold' },
        { label: 'Cash Received', value: dash.amountReceived, icon: ArrowDownLeft, color: 'text-green-400' },
        { label: 'Outstanding', value: dash.outstandingAmount, icon: Wallet, color: 'text-orange-400' },
        { label: 'Total Expenses', value: dash.totalExpenses, icon: ArrowUpRight, color: 'text-red-400' },
        { label: 'Net Profit (Cash)', value: dash.netProfit, icon: TrendingUp, color: 'text-gold' },
        { label: 'Staff Payments', value: dash.totalStaffPayments, icon: UserCog, color: 'text-red-400' },
        { label: 'Album Order Value', value: dash.totalAlbumOrderValue, icon: BookImage, color: 'text-gold' },
        { label: 'Album Profit (Info)', value: dash.totalAlbumProfit, icon: TrendingUp, color: 'text-green-400' },
      ]
    : [];

  const periodCards = period
    ? [
        { label: `${period.period.label} Received`, value: period.amountReceived, color: 'text-green-400' },
        { label: `${period.period.label} Expenses`, value: period.totalExpenses, color: 'text-red-400' },
        { label: 'Staff Payments', value: period.staffPayments, color: 'text-red-400' },
        { label: 'Net Profit', value: period.netProfit, color: 'text-gold' },
        { label: 'Invoice Value', value: period.totalInvoiceValue, color: 'text-gold' },
        { label: 'Album Value (Info)', value: period.albumOrderValue, color: 'text-gray-300' },
      ]
    : [];

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'income', label: 'Income' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'staff', label: 'Staff Payments' },
    { id: 'profit', label: 'P&L' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'transactions', label: 'Transactions' },
  ];

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-100">Accounts</h2>
          <p className="mt-1 text-sm text-gray-500">
            Income, expenses, staff payments, profit &amp; loss — integrated with bookings, invoices,
            albums and staff.
          </p>
        </div>
        <div className="flex gap-2">
          {canCreatePayment && (
            <button type="button" className="btn-primary" onClick={() => setPaymentOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </button>
          )}
          {canCreateExpense && (
            <button type="button" className="btn-secondary" onClick={openCreateExpense}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            feedback.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400',
          )}
        >
          {feedback.message}
        </div>
      )}

      <div className="card border-gold/10">
        <div className="mb-4 flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-gold" />
          <h3 className="font-display text-sm font-semibold text-gold">Period Filter</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACCOUNTS_DATE_PRESETS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                preset === item.value
                  ? 'bg-gold/15 text-gold'
                  : 'bg-surface-elevated text-gray-400 hover:text-gray-200',
              )}
              onClick={() => selectPreset(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">From</label>
              <input
                className="input-field"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">To</label>
              <input
                className="input-field"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <button type="button" className="btn-primary" onClick={() => applyFilters()}>
              Apply
            </button>
          </div>
        )}
        {filterError && <p className="mt-3 text-sm text-red-400">{filterError}</p>}
        {period && (
          <p className="mt-3 text-xs text-gray-500">
            Showing period: {period.period.label} ({period.period.dateFrom} to {period.period.dateTo})
          </p>
        )}
      </div>

      <div>
        <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">All-Time Snapshot</p>
        {dashboardQuery.isError ? (
          <ErrorState message={getApiErrorMessage(dashboardQuery.error, 'Failed to load dashboard.')} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dashboardQuery.isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="card h-24 animate-pulse bg-surface-elevated" />
                ))
              : allTimeCards.map((card) => (
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
      </div>

      {summaryQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-20 animate-pulse bg-surface-elevated" />
          ))}
        </div>
      ) : summaryQuery.isError ? null : (
        <div>
          <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">Selected Period</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {periodCards.map((card) => (
              <div key={card.label} className="card border-surface-border bg-surface-elevated p-4">
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={cn('mt-1 text-lg font-semibold', card.color)}>
                  {formatCurrency(card.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-surface-border pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cn(
              'rounded-t-lg px-4 py-2 text-sm font-medium transition',
              tab === t.id ? 'bg-gold/15 text-gold' : 'text-gray-500 hover:text-gray-300',
            )}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'income' || tab === 'staff' || tab === 'transactions' || tab === 'expenses') && (
        <form onSubmit={handleSearch} className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            className="input-field pl-10"
            placeholder={tab === 'expenses' ? 'Search expenses...' : 'Search transactions...'}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
      )}

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h3 className="mb-4 font-display text-lg font-semibold text-gold">Recent Income</h3>
            {incomeQuery.isLoading ? (
              <LoadingRows rows={4} />
            ) : (incomeQuery.data?.items.length ?? 0) === 0 ? (
              <EmptyState message="No payments received in this period." />
            ) : (
              <div className="space-y-2">
                {incomeQuery.data?.items.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-gray-200">{p.clientName}</p>
                      <p className="text-xs text-gray-500">
                        {p.receiptNumber} · {p.paymentDate}
                      </p>
                    </div>
                    <p className="font-semibold text-green-400">{formatCurrency(p.amount)}</p>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm text-gold hover:underline"
                  onClick={() => setTab('income')}
                >
                  View all income →
                </button>
              </div>
            )}
          </div>
          <div className="card">
            <h3 className="mb-4 font-display text-lg font-semibold text-gold">Booking Profitability</h3>
            <select
              className="input-field mb-4"
              value={profitBookingId}
              onChange={(e) => setProfitBookingId(e.target.value)}
            >
              <option value="">Select booking...</option>
              {(bookingsQuery.data?.items ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bookingNumber} — {b.client.fullName}
                </option>
              ))}
            </select>
            {bookingProfitQuery.isLoading && profitBookingId ? (
              <LoadingRows rows={3} />
            ) : bookingProfitQuery.data ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Revenue', formatCurrency(bookingProfitQuery.data.totalBookingAmount)],
                  ['Received', formatCurrency(bookingProfitQuery.data.totalReceived)],
                  ['Balance', formatCurrency(bookingProfitQuery.data.balance)],
                  ['Expenses', formatCurrency(bookingProfitQuery.data.totalExpenses)],
                  ['Net Profit', formatCurrency(bookingProfitQuery.data.netProfit)],
                  ['Margin', `${bookingProfitQuery.data.profitMarginPercent}%`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-surface-border bg-surface-elevated p-3"
                  >
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="mt-1 font-semibold text-gray-100">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Select a booking to view profitability." />
            )}
          </div>
        </div>
      )}

      {tab === 'income' && (
        <div className="card overflow-x-auto">
          {incomeQuery.isLoading ? (
            <LoadingRows />
          ) : incomeQuery.isError ? (
            <ErrorState message={getApiErrorMessage(incomeQuery.error, 'Failed to load income.')} />
          ) : (incomeQuery.data?.items.length ?? 0) === 0 ? (
            <EmptyState message="No payments received in this period." />
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-400">
                Total: {formatCurrency(incomeQuery.data?.totalAmount ?? 0)} ({incomeQuery.data?.total}{' '}
                payments)
              </p>
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Receipt</th>
                    <th className="px-3 py-3">Client</th>
                    <th className="px-3 py-3">Invoice</th>
                    <th className="px-3 py-3">Booking</th>
                    <th className="px-3 py-3">Method</th>
                    <th className="px-3 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeQuery.data?.items.map((row) => (
                    <tr key={row.id} className="border-b border-surface-border/70">
                      <td className="px-3 py-3 text-gray-400">{row.paymentDate}</td>
                      <td className="px-3 py-3">{row.receiptNumber}</td>
                      <td className="px-3 py-3">{row.clientName}</td>
                      <td className="px-3 py-3 text-gray-400">{row.invoiceNumber || '—'}</td>
                      <td className="px-3 py-3 text-gray-400">{row.bookingNumber || '—'}</td>
                      <td className="px-3 py-3 text-gray-400">{row.paymentMethod}</td>
                      <td className="px-3 py-3 font-semibold text-green-400">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {tab === 'expenses' && (
        <div className="space-y-6">
          {expenseBreakdownQuery.isLoading ? (
            <LoadingRows />
          ) : expenseBreakdownQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(expenseBreakdownQuery.error, 'Failed to load expense breakdown.')}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card border-red-500/20 p-4">
                <p className="text-xs text-gray-500">Total Expenses</p>
                <p className="mt-1 text-xl font-bold text-red-400">
                  {formatCurrency(expenseBreakdownQuery.data?.totalExpenses ?? 0)}
                </p>
              </div>
              <div className="card border-gold/20 p-4">
                <p className="text-xs text-gray-500">Staff Payments</p>
                <p className="mt-1 text-xl font-bold text-gold">
                  {formatCurrency(expenseBreakdownQuery.data?.staffPayments ?? 0)}
                </p>
              </div>
              {(expenseBreakdownQuery.data?.categories ?? []).slice(0, 4).map((cat) => (
                <div key={cat.categoryCode} className="card p-4">
                  <p className="text-xs text-gray-500">{cat.categoryLabel}</p>
                  <p className="mt-1 text-lg font-semibold text-gray-100">
                    {formatCurrency(cat.amount)}
                  </p>
                  <p className="text-xs text-gray-500">{cat.count} entries</p>
                </div>
              ))}
            </div>
          )}

          <div className="card overflow-x-auto">
            <h3 className="mb-4 font-display text-lg font-semibold text-gold">Expense Entries</h3>
            {expensesListQuery.isLoading ? (
              <LoadingRows />
            ) : (expensesListQuery.data?.items.length ?? 0) === 0 ? (
              <EmptyState message="No expenses in this period." />
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Source</th>
                    <th className="px-3 py-3">Booking</th>
                    <th className="px-3 py-3">Staff</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesListQuery.data?.items.map((e) => (
                    <tr key={e.id} className="border-b border-surface-border/70">
                      <td className="px-3 py-3 text-gray-400">{e.expenseDate}</td>
                      <td className="px-3 py-3">{e.categoryLabel}</td>
                      <td className="px-3 py-3">{e.description || '—'}</td>
                      <td className="px-3 py-3 text-xs text-gray-400">
                        {getExpenseSourceLabel(getExpenseSource(e))}
                      </td>
                      <td className="px-3 py-3 text-gray-400">{e.bookingNumber || '—'}</td>
                      <td className="px-3 py-3 text-gray-400">{e.staffName || '—'}</td>
                      <td className="px-3 py-3 font-semibold text-red-400">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
                            onClick={() => setViewExpense(e)}
                            aria-label="View expense"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canUpdateExpense && (
                            <button
                              type="button"
                              className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
                              onClick={() => openEditExpense(e)}
                              aria-label="Edit expense"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canUpdateExpense && (
                            <button
                              type="button"
                              className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-red-400"
                              onClick={() => openArchiveExpense(e)}
                              aria-label="Archive expense"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'staff' && (
        <div className="card overflow-x-auto">
          {staffQuery.isLoading ? (
            <LoadingRows />
          ) : staffQuery.isError ? (
            <ErrorState message={getApiErrorMessage(staffQuery.error, 'Failed to load staff payments.')} />
          ) : (staffQuery.data?.items.length ?? 0) === 0 ? (
            <EmptyState message="No staff payments in this period." />
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-400">
                Total staff payments: {formatCurrency(staffQuery.data?.totalAmount ?? 0)}
              </p>
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Staff</th>
                    <th className="px-3 py-3">Booking</th>
                    <th className="px-3 py-3">Source</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {staffQuery.data?.items.map((row) => (
                    <tr key={row.id} className="border-b border-surface-border/70">
                      <td className="px-3 py-3 text-gray-400">{row.expenseDate}</td>
                      <td className="px-3 py-3">
                        {row.staffName}
                        <span className="ml-1 text-xs text-gray-500">({row.staffCode})</span>
                      </td>
                      <td className="px-3 py-3 text-gray-400">{row.bookingNumber || '—'}</td>
                      <td className="px-3 py-3 capitalize text-gray-400">
                        {row.source.replace('_', ' ')}
                      </td>
                      <td className="px-3 py-3">{row.description || '—'}</td>
                      <td className="px-3 py-3 font-semibold text-red-400">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {tab === 'profit' && (
        <div className="card">
          {profitQuery.isLoading ? (
            <LoadingRows rows={4} />
          ) : profitQuery.isError ? (
            <ErrorState message={getApiErrorMessage(profitQuery.error, 'Failed to load P&L.')} />
          ) : profitQuery.data ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">Net Profit (Cash Basis)</p>
                <p className="mt-1 font-display text-3xl font-bold text-gold">
                  {formatCurrency(profitQuery.data.netProfit)}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Margin: {profitQuery.data.profitMarginPercent}% on cash received
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    { label: 'Invoice Revenue (Accrual)', value: profitQuery.data.invoiceRevenue, color: 'text-gold' },
                    { label: 'Cash Received', value: profitQuery.data.cashReceived, color: 'text-green-400' },
                    { label: 'Total Expenses', value: profitQuery.data.totalExpenses, color: 'text-red-400' },
                    { label: 'Staff Payments', value: profitQuery.data.staffPayments, color: 'text-red-400' },
                    { label: 'Album Value (Info)', value: profitQuery.data.albumOrderValue, color: 'text-gray-300' },
                    { label: 'Album Vendor Expense', value: profitQuery.data.albumVendorExpense, color: 'text-gray-400' },
                  ] as const
                ).map((row) => (
                  <div
                    key={row.label}
                    className="rounded-lg border border-surface-border bg-surface-elevated p-4"
                  >
                    <p className="text-xs text-gray-500">{row.label}</p>
                    <p className={cn('mt-1 text-lg font-semibold', row.color)}>
                      {formatCurrency(row.value)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Profit = Cash Received − Total Expenses. Album selling price is shown for reference only
                and is not added to invoice revenue. Staff and album vendor costs are included in
                expenses when synced.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'monthly' && (
        <div className="card overflow-x-auto">
          {monthlyQuery.isLoading ? (
            <LoadingRows rows={6} />
          ) : monthlyQuery.isError ? (
            <ErrorState message={getApiErrorMessage(monthlyQuery.error, 'Failed to load monthly summary.')} />
          ) : (monthlyQuery.data?.length ?? 0) === 0 ? (
            <EmptyState message="No monthly data available." />
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-3">Month</th>
                  <th className="px-3 py-3">Invoice</th>
                  <th className="px-3 py-3">Received</th>
                  <th className="px-3 py-3">Expenses</th>
                  <th className="px-3 py-3">Staff</th>
                  <th className="px-3 py-3">Profit</th>
                  <th className="px-3 py-3">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {monthlyQuery.data?.map((row) => (
                  <tr key={`${row.year}-${row.month}`} className="border-b border-surface-border/70">
                    <td className="px-3 py-3 font-medium text-gray-200">{row.label}</td>
                    <td className="px-3 py-3 text-gray-300">{formatCurrency(row.invoiceRevenue)}</td>
                    <td className="px-3 py-3 text-green-400">{formatCurrency(row.cashReceived)}</td>
                    <td className="px-3 py-3 text-red-400">{formatCurrency(row.expenses)}</td>
                    <td className="px-3 py-3 text-red-400">{formatCurrency(row.staffPayments)}</td>
                    <td className="px-3 py-3 font-semibold text-gold">{formatCurrency(row.profit)}</td>
                    <td className="px-3 py-3 text-gray-400">{row.bookingsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="card overflow-x-auto">
          <div className="mb-4 flex flex-wrap gap-2">
            {(['all', 'income', 'expense'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium capitalize',
                  txnType === type ? 'bg-gold/15 text-gold' : 'bg-surface-elevated text-gray-400',
                )}
                onClick={() => setTxnType(type)}
              >
                {type}
              </button>
            ))}
          </div>
          {transactionsQuery.isLoading ? (
            <LoadingRows />
          ) : transactionsQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(transactionsQuery.error, 'Failed to load transactions.')}
            />
          ) : (transactionsQuery.data?.items.length ?? 0) === 0 ? (
            <EmptyState message="No transactions in this period." />
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-400">
                Income {formatCurrency(transactionsQuery.data?.totalIncome ?? 0)} · Expenses{' '}
                {formatCurrency(transactionsQuery.data?.totalExpense ?? 0)}
              </p>
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Client</th>
                    <th className="px-3 py-3">Income</th>
                    <th className="px-3 py-3">Expense</th>
                    <th className="px-3 py-3">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsQuery.data?.items.map((t) => (
                    <tr key={`${t.type}-${t.id}`} className="border-b border-surface-border/70">
                      <td className="px-3 py-3 text-gray-400">{t.date}</td>
                      <td className="px-3 py-3 capitalize">{t.type}</td>
                      <td className="px-3 py-3">{t.description}</td>
                      <td className="px-3 py-3 text-gray-400">{t.clientName || '—'}</td>
                      <td className="px-3 py-3 text-green-400">
                        {t.income > 0 ? formatCurrency(t.income) : '—'}
                      </td>
                      <td className="px-3 py-3 text-red-400">
                        {t.expense > 0 ? formatCurrency(t.expense) : '—'}
                      </td>
                      <td className="px-3 py-3 font-medium text-gold">
                        {formatCurrency(t.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      <AddPaymentModal
        open={paymentOpen}
        isSubmitting={paymentMutation.isPending}
        onClose={() => setPaymentOpen(false)}
        onSubmit={(values) => paymentMutation.mutate(values)}
      />

      <AddExpenseModal
        open={expenseOpen}
        mode={expenseModalMode}
        expense={selectedExpense}
        isSubmitting={expenseMutation.isPending || updateExpenseMutation.isPending}
        onClose={() => {
          setExpenseOpen(false);
          setSelectedExpense(null);
        }}
        onSubmit={(values) => {
          const payload = buildExpensePayload(values);
          if (expenseModalMode === 'edit' && selectedExpense) {
            updateExpenseMutation.mutate({ id: selectedExpense.id, payload });
            return;
          }
          expenseMutation.mutate(payload);
        }}
      />

      <ExpenseViewModal
        open={Boolean(viewExpense)}
        expense={viewExpense}
        canEdit={canUpdateExpense}
        onClose={() => setViewExpense(null)}
        onEdit={(expense) => {
          setViewExpense(null);
          openEditExpense(expense);
        }}
      />

      <ArchiveExpenseDialog
        open={Boolean(archiveExpense)}
        expense={archiveExpense}
        isSubmitting={archiveExpenseMutation.isPending}
        onClose={() => setArchiveExpense(null)}
        onConfirm={() => {
          if (archiveExpense) {
            archiveExpenseMutation.mutate(archiveExpense.id);
          }
        }}
      />

      <PaymentReceiptModal
        open={Boolean(receiptPayment)}
        payment={receiptPayment}
        onClose={() => setReceiptPayment(null)}
      />
    </div>
  );
}

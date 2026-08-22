import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookImage,
  CalendarRange,
  Eye,
  IndianRupee,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  UserCog,
  Wallet,
} from 'lucide-react';
import { AccountsCountUp } from '@/components/accounts/AccountsCountUp';
import { AccountsMonthlyChart } from '@/components/accounts/AccountsMonthlyChart';
import {
  ACCOUNTS_DATE_PRESETS,
  AccountsDatePreset,
  accountsService,
} from '@/services/accounts-service';
import { paymentsService, Payment } from '@/services/payments-service';
import { invoicesService } from '@/services/invoices-service';
import {
  expensesService,
  Expense,
  isSystemLinkedExpense,
  getExpenseSourceLabel,
  getExpenseSource,
} from '@/services/expenses-service';
import { bookingsService } from '@/services/bookings-service';
import { useAuthStore } from '@/stores/auth-store';
import { AddPaymentModal } from '@/components/accounts/AddPaymentModal';
import { AddExpenseModal } from '@/components/accounts/AddExpenseModal';
import { AddStaffPaymentModal, StaffPaymentFormValues } from '@/components/accounts/AddStaffPaymentModal';
import { ExpenseViewModal } from '@/components/accounts/ExpenseViewModal';
import { ArchiveExpenseDialog } from '@/components/accounts/ArchiveExpenseDialog';
import { PaymentReceiptModal } from '@/components/accounts/PaymentReceiptModal';
import { formatCurrency } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { firstOfMonthIso, todayIso } from '@/utils/studio-date';
import { cn } from '@/utils/cn';
import {
  invalidateAfterAccountsExpense,
  invalidateAfterAccountsPayment,
} from '@/utils/invalidate-financial-queries';
import './accounts/accounts-page.css';

type Tab = 'overview' | 'income' | 'expenses' | 'staff' | 'profit' | 'monthly' | 'transactions';

function EmptyState({ message }: { message: string }) {
  return (
    <div className="dhara-acc-empty">
      <Wallet />
      <p>{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="dhara-acc-error">
      <Wallet />
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="dhara-acc-btn is-gold" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dhara-acc-skeleton" />
      ))}
    </div>
  );
}

function AccountsHeroArt() {
  return (
    <svg viewBox="0 0 220 180" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="accHeroGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#c9a227" />
        </linearGradient>
      </defs>
      <circle cx="118" cy="92" r="78" stroke="url(#accHeroGold)" strokeOpacity="0.18" />
      <circle cx="118" cy="92" r="58" stroke="url(#accHeroGold)" strokeOpacity="0.38" strokeWidth="1.4" />
      <circle cx="118" cy="92" r="40" stroke="#22d3ee" strokeOpacity="0.28" strokeWidth="1.2" />
      <path
        d="M78 62h80M78 86h80M78 110h52"
        stroke="rgba(255,241,201,0.42)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <text
        x="118"
        y="104"
        textAnchor="middle"
        fill="url(#accHeroGold)"
        fontSize="58"
        fontFamily="Cormorant Garamond, serif"
        fontWeight="700"
      >
        ₹
      </text>
    </svg>
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
  const [staffPaymentOpen, setStaffPaymentOpen] = useState(false);
  const [staffPaymentMode, setStaffPaymentMode] = useState<'create' | 'edit'>('create');
  const [staffPaymentExpense, setStaffPaymentExpense] = useState<Expense | null>(null);
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
    enabled: tab === 'monthly' || tab === 'overview',
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
      invalidateAfterAccountsPayment(queryClient);
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
      invalidateAfterAccountsExpense(queryClient);
      setExpenseOpen(false);
      setSelectedExpense(null);
      setFeedback({ type: 'success', message: 'Expense recorded successfully.' });
    },
    onError: (e: unknown) =>
      setFeedback({ type: 'error', message: getApiErrorMessage(e, 'Failed to record expense.') }),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof expensesService.update>[1];
    }) => expensesService.update(id, payload),
    onSuccess: () => {
      invalidateAfterAccountsExpense(queryClient);
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
      invalidateAfterAccountsExpense(queryClient);
      setArchiveExpense(null);
      setViewExpense(null);
      setFeedback({ type: 'success', message: 'Expense archived successfully.' });
    },
    onError: (e: unknown) =>
      setFeedback({ type: 'error', message: getApiErrorMessage(e, 'Failed to archive expense.') }),
  });

  const staffPaymentMutation = useMutation({
    mutationFn: (values: StaffPaymentFormValues) => {
      const payload = {
        staffId: values.staffId,
        amount: values.amount,
        paymentDate: values.paymentDate,
        paymentModeCode: values.paymentModeCode,
        bookingId: values.bookingId?.trim() || undefined,
        referenceNumber: values.referenceNumber?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      };
      if (staffPaymentMode === 'edit' && staffPaymentExpense) {
        return expensesService.updateStaffPayment(staffPaymentExpense.id, payload);
      }
      return expensesService.createStaffPayment(payload);
    },
    onSuccess: () => {
      invalidateAfterAccountsExpense(queryClient);
      setStaffPaymentOpen(false);
      setStaffPaymentExpense(null);
      setViewExpense(null);
      setFeedback({
        type: 'success',
        message:
          staffPaymentMode === 'edit'
            ? 'Staff payment updated successfully.'
            : 'Staff payment recorded successfully.',
      });
    },
    onError: (e: unknown) =>
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(e, 'Failed to save staff payment.'),
      }),
  });

  const openCreateExpense = () => {
    setExpenseModalMode('create');
    setSelectedExpense(null);
    setExpenseOpen(true);
  };

  const openArchiveExpense = (expense: Expense) => {
    if (isSystemLinkedExpense(expense)) {
      setFeedback({
        type: 'error',
        message:
          'System-linked expenses cannot be archived here. Update or remove them from the booking or album record.',
      });
      return;
    }
    setArchiveExpense(expense);
  };

  const openEditExpense = (expense: Expense) => {
    if (isSystemLinkedExpense(expense)) {
      setViewExpense(expense);
      return;
    }
    if (expense.categoryCode === 'staff') {
      setStaffPaymentMode('edit');
      setStaffPaymentExpense(expense);
      setStaffPaymentOpen(true);
      return;
    }
    setExpenseModalMode('edit');
    setSelectedExpense(expense);
    setExpenseOpen(true);
  };

  const openStaffPaymentRow = async (id: string, action: 'view' | 'edit' | 'archive') => {
    try {
      const expense = await expensesService.getById(id);
      if (action === 'view') {
        setViewExpense(expense);
        return;
      }
      if (action === 'edit') {
        openEditExpense(expense);
        return;
      }
      openArchiveExpense(expense);
    } catch (e: unknown) {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(e, 'Failed to load staff payment.'),
      });
    }
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
        {
          label: 'Cash Received',
          value: dash.amountReceived,
          subtitle: `This month: ${formatCurrency(dash.thisMonthRevenue)}`,
          icon: ArrowDownLeft,
          tone: 'is-green',
        },
        {
          label: 'Total Expenses',
          value: dash.totalExpenses,
          subtitle: `This month: ${formatCurrency(dash.thisMonthExpenses)}`,
          icon: ArrowUpRight,
          tone: 'is-magenta',
        },
        {
          label: 'Net Profit (Cash)',
          value: dash.netProfit,
          subtitle: `This month: ${formatCurrency(dash.thisMonthProfit)}`,
          icon: TrendingUp,
          tone: 'is-gold',
        },
        {
          label: 'Outstanding',
          value: dash.outstandingAmount,
          subtitle: 'Invoice balance due',
          icon: Wallet,
          tone: 'is-amber',
        },
        {
          label: 'Total Invoice Value',
          value: dash.totalRevenue,
          subtitle: 'All-time billed value',
          icon: IndianRupee,
          tone: 'is-cyan',
        },
        {
          label: 'Staff Payments',
          value: dash.totalStaffPayments,
          subtitle: `This month: ${formatCurrency(dash.thisMonthStaffPayments)}`,
          icon: UserCog,
          tone: 'is-rose',
        },
        {
          label: 'Album Order Value',
          value: dash.totalAlbumOrderValue,
          subtitle: 'Informational — not invoice revenue',
          icon: BookImage,
          tone: 'is-gold',
        },
        {
          label: 'Album Profit (Info)',
          value: dash.totalAlbumProfit,
          subtitle: 'Album selling price minus vendor cost',
          icon: TrendingUp,
          tone: 'is-green',
        },
      ]
    : [];

  const periodCards = period
    ? [
        {
          label: `${period.period.label} Received`,
          value: period.amountReceived,
          tone: 'is-green',
        },
        {
          label: `${period.period.label} Expenses`,
          value: period.totalExpenses,
          tone: 'is-magenta',
        },
        { label: 'Staff Payments', value: period.staffPayments, tone: 'is-rose' },
        { label: 'Net Profit', value: period.netProfit, tone: 'is-gold' },
        { label: 'Invoice Value', value: period.totalInvoiceValue, tone: 'is-cyan' },
        { label: 'Outstanding', value: period.outstandingAmount, tone: 'is-amber' },
        { label: 'Album Value (Info)', value: period.albumOrderValue, tone: 'is-gold' },
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
    <>
    <div className="dhara-acc">
      <div className="dhara-acc-ambient" aria-hidden>
        <span className="dhara-acc-orb is-maroon" />
        <span className="dhara-acc-orb is-gold" />
        <span className="dhara-acc-orb is-cyan" />
      </div>
      <section className="dhara-acc-hero">
        <span className="dhara-acc-lens" aria-hidden />
        <div>
          <p className="dhara-acc-kicker">Dhara Photography ERP Pro</p>
          <h2>Accounts Management</h2>
          <p className="dhara-acc-hero-copy">એકાઉન્ટ્સ — આવક, ખર્ચ અને નફાનું સ્ટુડિયો કમાન્ડ સેન્ટર</p>
          <div className="dhara-acc-hero-actions">
            {canCreatePayment && (
              <button
                type="button"
                className="dhara-acc-btn is-gold"
                onClick={() => setPaymentOpen(true)}
              >
                <Plus />
                Add Payment
              </button>
            )}
            {canCreateExpense && (
              <button type="button" className="dhara-acc-btn" onClick={openCreateExpense}>
                <Plus />
                Add Expense
              </button>
            )}
            {canCreateExpense && (
              <button
                type="button"
                className="dhara-acc-btn"
                onClick={() => {
                  setStaffPaymentMode('create');
                  setStaffPaymentExpense(null);
                  setStaffPaymentOpen(true);
                }}
              >
                <Plus />
                Add Staff Payment
              </button>
            )}
          </div>
        </div>
        <div className="dhara-acc-hero-art">
          <span className="dhara-acc-hero-halo" aria-hidden />
          <AccountsHeroArt />
        </div>
      </section>

      {feedback && (
        <div className={cn('dhara-acc-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
          {feedback.message}
        </div>
      )}

      <section className="dhara-acc-panel">
        <h3 className="dhara-acc-section-title">
          <CalendarRange className="mr-2 inline h-5 w-5" />
          Period Filter
        </h3>
        <div className="dhara-acc-presets">
          {ACCOUNTS_DATE_PRESETS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={cn('dhara-acc-chip', preset === item.value && 'is-on')}
              onClick={() => selectPreset(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="dhara-acc-toolbar-row" style={{ marginTop: '1rem' }}>
            <div className="dhara-acc-field">
              <label htmlFor="acc-from">From</label>
              <input
                id="acc-from"
                className="dhara-acc-input"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="dhara-acc-field">
              <label htmlFor="acc-to">To</label>
              <input
                id="acc-to"
                className="dhara-acc-input"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <button type="button" className="dhara-acc-btn is-gold" onClick={() => applyFilters()}>
              Apply
            </button>
          </div>
        )}
        {filterError && <p className="dhara-acc-err">{filterError}</p>}
        {period && (
          <p className="dhara-acc-note">
            Showing period: {period.period.label} ({period.period.dateFrom} to {period.period.dateTo}
            )
          </p>
        )}
      </section>

      <div>
        <p className="dhara-acc-section-title">All-Time Snapshot</p>
        {dashboardQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(dashboardQuery.error, 'Failed to load dashboard.')}
            onRetry={() => void dashboardQuery.refetch()}
          />
        ) : (
          <div className="dhara-acc-kpis">
            {dashboardQuery.isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="dhara-acc-skeleton" style={{ height: '7.5rem' }} />
                ))
              : allTimeCards.map((card) => (
                  <article key={card.label} className={cn('dhara-acc-kpi', card.tone)}>
                    <div className="dhara-acc-kpi-top">
                      <div>
                        <h3>{card.label}</h3>
                        <p>{card.subtitle}</p>
                      </div>
                      <span className="dhara-acc-icon">
                        <card.icon />
                      </span>
                    </div>
                    <strong>
                      <AccountsCountUp value={card.value} />
                    </strong>
                  </article>
                ))}
          </div>
        )}
      </div>

      {summaryQuery.isLoading ? (
        <div className="dhara-acc-kpis">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dhara-acc-skeleton" style={{ height: '5.5rem' }} />
          ))}
        </div>
      ) : summaryQuery.isError ? (
        <ErrorState
          message={getApiErrorMessage(summaryQuery.error, 'Failed to load period summary.')}
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : (
        <div>
          <p className="dhara-acc-section-title">Selected Period</p>
          <div className="dhara-acc-kpis">
            {periodCards.map((card) => (
              <article key={card.label} className={cn('dhara-acc-kpi', card.tone)}>
                <h3>{card.label}</h3>
                <strong>
                  <AccountsCountUp value={card.value} />
                </strong>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="dhara-acc-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cn('dhara-acc-tab', tab === t.id && 'is-on')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'income' || tab === 'staff' || tab === 'transactions' || tab === 'expenses') && (
        <form onSubmit={handleSearch} className="dhara-acc-input-wrap" style={{ maxWidth: '28rem' }}>
          <Search />
          <input
            className="dhara-acc-input is-icon"
            placeholder={tab === 'expenses' ? 'Search expenses...' : 'Search transactions...'}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
      )}

      {tab === 'overview' && (
        <div className="dhara-acc-split">
          <div className="dhara-acc-card">
            <h3>Cash flow (12 months)</h3>
            {monthlyQuery.isLoading ? (
              <LoadingRows rows={4} />
            ) : monthlyQuery.isError ? (
              <ErrorState
                message={getApiErrorMessage(monthlyQuery.error, 'Failed to load monthly summary.')}
                onRetry={() => void monthlyQuery.refetch()}
              />
            ) : (monthlyQuery.data?.length ?? 0) === 0 ? (
              <EmptyState message="No monthly data available." />
            ) : (
              <AccountsMonthlyChart rows={monthlyQuery.data ?? []} />
            )}
          </div>
          <div className="dhara-acc-card">
            <h3>Recent Income</h3>
            {incomeQuery.isLoading ? (
              <LoadingRows rows={4} />
            ) : (incomeQuery.data?.items.length ?? 0) === 0 ? (
              <EmptyState
                message={
                  search ? 'No payments match your search.' : 'No payments received in this period.'
                }
              />
            ) : (
              <div>
                {incomeQuery.data?.items.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3"
                    style={{
                      padding: '0.7rem 0',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div>
                      <p>{p.clientName}</p>
                      <p className="dhara-acc-note" style={{ margin: 0 }}>
                        {p.receiptNumber} · {p.paymentDate}
                      </p>
                    </div>
                    <p className="dhara-acc-amt is-in">{formatCurrency(p.amount)}</p>
                  </div>
                ))}
                <button type="button" className="dhara-acc-link" onClick={() => setTab('income')}>
                  View all income →
                </button>
              </div>
            )}
          </div>
          <div className="dhara-acc-card" style={{ gridColumn: '1 / -1' }}>
            <h3>Booking Profitability</h3>
            <div className="dhara-acc-field" style={{ maxWidth: '28rem', marginBottom: '1rem' }}>
              <label htmlFor="acc-booking-profit">Select booking</label>
              <select
                id="acc-booking-profit"
                className="dhara-acc-input"
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
            </div>
            {bookingProfitQuery.isLoading && profitBookingId ? (
              <LoadingRows rows={3} />
            ) : bookingProfitQuery.data ? (
              <div className="dhara-acc-facts">
                {[
                  ['Revenue', formatCurrency(bookingProfitQuery.data.totalBookingAmount)],
                  ['Received', formatCurrency(bookingProfitQuery.data.totalReceived)],
                  ['Balance', formatCurrency(bookingProfitQuery.data.balance)],
                  ['Expenses', formatCurrency(bookingProfitQuery.data.totalExpenses)],
                  ['Net Profit', formatCurrency(bookingProfitQuery.data.netProfit)],
                  ['Margin', `${bookingProfitQuery.data.profitMarginPercent}%`],
                ].map(([label, value]) => (
                  <div key={label} className="dhara-acc-fact">
                    <span>{label}</span>
                    <strong>{value}</strong>
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
        <div className="dhara-acc-card">
          {incomeQuery.isLoading ? (
            <LoadingRows />
          ) : incomeQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(incomeQuery.error, 'Failed to load income.')}
              onRetry={() => void incomeQuery.refetch()}
            />
          ) : (incomeQuery.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              message={
                search ? 'No payments match your search.' : 'No payments received in this period.'
              }
            />
          ) : (
            <>
              <p className="dhara-acc-note">
                Total: {formatCurrency(incomeQuery.data?.totalAmount ?? 0)} (
                {incomeQuery.data?.total} payments)
              </p>
              <div className="dhara-acc-table-wrap">
                <table className="dhara-acc-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Receipt</th>
                      <th>Client</th>
                      <th>Invoice</th>
                      <th>Booking</th>
                      <th>Method</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeQuery.data?.items.map((row) => (
                      <tr key={row.id}>
                        <td>{row.paymentDate}</td>
                        <td>{row.receiptNumber}</td>
                        <td>{row.clientName}</td>
                        <td>{row.invoiceNumber || '—'}</td>
                        <td>{row.bookingNumber || '—'}</td>
                        <td>{row.paymentMethod}</td>
                        <td className="dhara-acc-amt is-in">{formatCurrency(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              message={getApiErrorMessage(
                expenseBreakdownQuery.error,
                'Failed to load expense breakdown.',
              )}
              onRetry={() => void expenseBreakdownQuery.refetch()}
            />
          ) : (
            <div className="dhara-acc-kpis">
              <article className="dhara-acc-kpi is-magenta">
                <h3>Total Expenses</h3>
                <strong>
                  <AccountsCountUp value={expenseBreakdownQuery.data?.totalExpenses ?? 0} />
                </strong>
              </article>
              <article className="dhara-acc-kpi is-gold">
                <h3>Staff Payments</h3>
                <strong>
                  <AccountsCountUp value={expenseBreakdownQuery.data?.staffPayments ?? 0} />
                </strong>
              </article>
              {(expenseBreakdownQuery.data?.categories ?? []).slice(0, 4).map((cat) => (
                <article key={cat.categoryCode} className="dhara-acc-kpi is-cyan">
                  <h3>{cat.categoryLabel}</h3>
                  <p>{cat.count} entries</p>
                  <strong>
                    <AccountsCountUp value={cat.amount} />
                  </strong>
                </article>
              ))}
            </div>
          )}

          <div className="dhara-acc-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3>Expense Entries</h3>
              <Link to="/expenses" className="dhara-acc-link" style={{ marginTop: 0 }}>
                Open expense ledger →
              </Link>
            </div>
            {expensesListQuery.isLoading ? (
              <LoadingRows />
            ) : (expensesListQuery.data?.items.length ?? 0) === 0 ? (
              <EmptyState
                message={search ? 'No expenses match your search.' : 'No expenses in this period.'}
              />
            ) : (
              <div className="dhara-acc-table-wrap">
                <table className="dhara-acc-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Source</th>
                      <th>Booking</th>
                      <th>Staff</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesListQuery.data?.items.map((e) => (
                      <tr key={e.id}>
                        <td>{e.expenseDate}</td>
                        <td>{e.categoryLabel}</td>
                        <td>{e.description || '—'}</td>
                        <td>{getExpenseSourceLabel(getExpenseSource(e))}</td>
                        <td>{e.bookingNumber || '—'}</td>
                        <td>{e.staffName || '—'}</td>
                        <td className="dhara-acc-amt is-out">{formatCurrency(e.amount)}</td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              className="dhara-acc-icon-btn"
                              onClick={() => setViewExpense(e)}
                              aria-label="View expense"
                            >
                              <Eye />
                            </button>
                            {canUpdateExpense && (
                              <button
                                type="button"
                                className="dhara-acc-icon-btn"
                                onClick={() => openEditExpense(e)}
                                aria-label="Edit expense"
                              >
                                <Pencil />
                              </button>
                            )}
                            {canUpdateExpense && (
                              <button
                                type="button"
                                className="dhara-acc-icon-btn"
                                onClick={() => openArchiveExpense(e)}
                                aria-label="Archive expense"
                              >
                                <Trash2 />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'staff' && (
        <div className="dhara-acc-card">
          {staffQuery.isLoading ? (
            <LoadingRows />
          ) : staffQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(staffQuery.error, 'Failed to load staff payments.')}
              onRetry={() => void staffQuery.refetch()}
            />
          ) : (staffQuery.data?.items.length ?? 0) === 0 ? (
            <EmptyState message="No staff payments in this period." />
          ) : (
            <>
              <p className="dhara-acc-note">
                Total staff payments: {formatCurrency(staffQuery.data?.totalAmount ?? 0)}
              </p>
              <div className="dhara-acc-table-wrap">
                <table className="dhara-acc-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Staff</th>
                      <th>Booking</th>
                      <th>Source</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffQuery.data?.items.map((row) => (
                      <tr key={row.id}>
                        <td>{row.expenseDate}</td>
                        <td>
                          {row.staffName} ({row.staffCode})
                        </td>
                        <td>{row.bookingNumber || '—'}</td>
                        <td className="capitalize">{row.source.replace('_', ' ')}</td>
                        <td>{row.description || '—'}</td>
                        <td className="dhara-acc-amt is-out">{formatCurrency(row.amount)}</td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              className="dhara-acc-icon-btn"
                              onClick={() => void openStaffPaymentRow(row.id, 'view')}
                              aria-label="View staff payment"
                            >
                              <Eye />
                            </button>
                            {canUpdateExpense && row.source === 'manual' && (
                              <button
                                type="button"
                                className="dhara-acc-icon-btn"
                                onClick={() => void openStaffPaymentRow(row.id, 'edit')}
                                aria-label="Edit staff payment"
                              >
                                <Pencil />
                              </button>
                            )}
                            {canUpdateExpense && row.source === 'manual' && (
                              <button
                                type="button"
                                className="dhara-acc-icon-btn"
                                onClick={() => void openStaffPaymentRow(row.id, 'archive')}
                                aria-label="Archive staff payment"
                              >
                                <Trash2 />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'profit' && (
        <div className="dhara-acc-card">
          {profitQuery.isLoading ? (
            <LoadingRows rows={4} />
          ) : profitQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(profitQuery.error, 'Failed to load P&L.')}
              onRetry={() => void profitQuery.refetch()}
            />
          ) : profitQuery.data ? (
            <div>
              <article className="dhara-acc-kpi is-gold" style={{ marginBottom: '1rem' }}>
                <h3>Net Profit (Cash Basis)</h3>
                <p>Margin: {profitQuery.data.profitMarginPercent}% on cash received</p>
                <strong>
                  <AccountsCountUp value={profitQuery.data.netProfit} />
                </strong>
              </article>
              <div className="dhara-acc-kpis">
                {(
                  [
                    {
                      label: 'Invoice Revenue (Accrual)',
                      value: profitQuery.data.invoiceRevenue,
                      tone: 'is-gold',
                    },
                    {
                      label: 'Cash Received',
                      value: profitQuery.data.cashReceived,
                      tone: 'is-green',
                    },
                    {
                      label: 'Total Expenses',
                      value: profitQuery.data.totalExpenses,
                      tone: 'is-magenta',
                    },
                    {
                      label: 'Staff Payments',
                      value: profitQuery.data.staffPayments,
                      tone: 'is-rose',
                    },
                    {
                      label: 'Album Value (Info)',
                      value: profitQuery.data.albumOrderValue,
                      tone: 'is-cyan',
                    },
                    {
                      label: 'Album Vendor Expense',
                      value: profitQuery.data.albumVendorExpense,
                      tone: 'is-amber',
                    },
                  ] as const
                ).map((row) => (
                  <article key={row.label} className={cn('dhara-acc-kpi', row.tone)}>
                    <h3>{row.label}</h3>
                    <strong>
                      <AccountsCountUp value={row.value} />
                    </strong>
                  </article>
                ))}
              </div>
              <p className="dhara-acc-note">
                Profit = Cash Received − Total Expenses. Album selling price is shown for reference
                only and is not added to invoice revenue. Staff and album vendor costs are included
                in expenses when synced.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'monthly' && (
        <div className="dhara-acc-card">
          {monthlyQuery.isLoading ? (
            <LoadingRows rows={6} />
          ) : monthlyQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(monthlyQuery.error, 'Failed to load monthly summary.')}
              onRetry={() => void monthlyQuery.refetch()}
            />
          ) : (monthlyQuery.data?.length ?? 0) === 0 ? (
            <EmptyState message="No monthly data available." />
          ) : (
            <>
              <AccountsMonthlyChart rows={monthlyQuery.data ?? []} />
              <div className="dhara-acc-table-wrap" style={{ marginTop: '1rem' }}>
                <table className="dhara-acc-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Invoice</th>
                      <th>Received</th>
                      <th>Expenses</th>
                      <th>Staff</th>
                      <th>Profit</th>
                      <th>Bookings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyQuery.data?.map((row) => (
                      <tr key={`${row.year}-${row.month}`}>
                        <td>{row.label}</td>
                        <td>{formatCurrency(row.invoiceRevenue)}</td>
                        <td className="dhara-acc-amt is-in">{formatCurrency(row.cashReceived)}</td>
                        <td className="dhara-acc-amt is-out">{formatCurrency(row.expenses)}</td>
                        <td className="dhara-acc-amt is-out">{formatCurrency(row.staffPayments)}</td>
                        <td className="dhara-acc-amt is-gold">{formatCurrency(row.profit)}</td>
                        <td>{row.bookingsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="dhara-acc-card">
          <div className="dhara-acc-presets" style={{ marginBottom: '1rem' }}>
            {(['all', 'income', 'expense'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={cn('dhara-acc-chip', txnType === type && 'is-on')}
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
              onRetry={() => void transactionsQuery.refetch()}
            />
          ) : (transactionsQuery.data?.items.length ?? 0) === 0 ? (
            <EmptyState message="No transactions in this period." />
          ) : (
            <>
              <p className="dhara-acc-note">
                Income {formatCurrency(transactionsQuery.data?.totalIncome ?? 0)} · Expenses{' '}
                {formatCurrency(transactionsQuery.data?.totalExpense ?? 0)}
              </p>
              <div className="dhara-acc-table-wrap">
                <table className="dhara-acc-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Client</th>
                      <th>Income</th>
                      <th>Expense</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsQuery.data?.items.map((t) => (
                      <tr key={`${t.type}-${t.id}`}>
                        <td>{t.date}</td>
                        <td>
                          <span className={cn('dhara-acc-pill', t.type === 'income' ? 'is-income' : 'is-expense')}>
                            {t.type}
                          </span>
                        </td>
                        <td>{t.description}</td>
                        <td>{t.clientName || '—'}</td>
                        <td className="dhara-acc-amt is-in">
                          {t.income > 0 ? formatCurrency(t.income) : '—'}
                        </td>
                        <td className="dhara-acc-amt is-out">
                          {t.expense > 0 ? formatCurrency(t.expense) : '—'}
                        </td>
                        <td className="dhara-acc-amt is-gold">{formatCurrency(t.runningBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>

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

      <AddStaffPaymentModal
        open={staffPaymentOpen}
        mode={staffPaymentMode}
        expense={staffPaymentExpense}
        isSubmitting={staffPaymentMutation.isPending}
        onClose={() => {
          setStaffPaymentOpen(false);
          setStaffPaymentExpense(null);
        }}
        onSubmit={(values) => staffPaymentMutation.mutate(values)}
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
    </>
  );
}

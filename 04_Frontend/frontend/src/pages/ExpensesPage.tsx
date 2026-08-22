import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDown,
  Eye,
  Hash,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { AddExpenseModal, ExpenseFormValues } from '@/components/accounts/AddExpenseModal';
import { ArchiveExpenseDialog } from '@/components/accounts/ArchiveExpenseDialog';
import { ExpenseViewModal } from '@/components/accounts/ExpenseViewModal';
import { AccountsCountUp } from '@/components/accounts/AccountsCountUp';
import { expenseCategoryTone } from '@/components/expenses/expense-visual';
import { useMasterDataOptions } from '@/hooks/use-master-data-options';
import {
  Expense,
  expensesService,
  getExpenseSource,
  getExpenseSourceLabel,
  isSystemLinkedExpense,
  toExpensePayload,
} from '@/services/expenses-service';
import { useAuthStore } from '@/stores/auth-store';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatCurrency } from '@/utils/booking-form';
import { cn } from '@/utils/cn';
import { invalidateAfterAccountsExpense } from '@/utils/invalidate-financial-queries';
import './expenses/expenses-page.css';

type ExpenseSortField = 'expenseDate' | 'amount' | 'createdAt';

function ExpensesHeroArt() {
  return (
    <svg viewBox="0 0 220 180" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="expHeroGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#ff9a3c" />
        </linearGradient>
      </defs>
      <circle cx="118" cy="92" r="78" stroke="url(#expHeroGold)" strokeOpacity="0.2" />
      <circle cx="118" cy="92" r="56" stroke="url(#expHeroGold)" strokeOpacity="0.4" strokeWidth="1.4" />
      <rect x="78" y="54" width="80" height="84" rx="10" stroke="url(#expHeroGold)" strokeWidth="2" />
      <path d="M92 72h52M92 90h52M92 108h36" stroke="rgba(255,241,201,0.5)" strokeWidth="1.8" strokeLinecap="round" />
      <text
        x="118"
        y="148"
        textAnchor="middle"
        fill="url(#expHeroGold)"
        fontSize="28"
        fontFamily="Cormorant Garamond, serif"
        fontWeight="700"
      >
        ₹
      </text>
    </svg>
  );
}

export function ExpensesPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('expenses.create');
  const canUpdate = hasPermission('expenses.update');

  const categoryOptions = useMasterDataOptions('expense_category');
  const paymentModeOptions = useMasterDataOptions('payment_mode');

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [paymentModeCode, setPaymentModeCode] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<ExpenseSortField>('expenseDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [archiveExpense, setArchiveExpense] = useState<Expense | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const createMutation = useMutation({
    mutationFn: expensesService.create,
    onSuccess: () => {
      invalidateAfterAccountsExpense(queryClient);
      setFormOpen(false);
      setSelectedExpense(null);
      setFeedback({ type: 'success', message: 'Expense recorded successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to record expense.'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof toExpensePayload> }) =>
      expensesService.update(id, payload),
    onSuccess: () => {
      invalidateAfterAccountsExpense(queryClient);
      setFormOpen(false);
      setSelectedExpense(null);
      setViewExpense(null);
      setFeedback({ type: 'success', message: 'Expense updated successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update expense.'),
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: expensesService.archive,
    onSuccess: () => {
      invalidateAfterAccountsExpense(queryClient);
      setArchiveExpense(null);
      setViewExpense(null);
      setFeedback({ type: 'success', message: 'Expense archived successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to archive expense.'),
      });
    },
  });

  const dateRangeError =
    dateFrom && dateTo && dateFrom > dateTo ? 'Start date must be on or before end date.' : null;

  const listQuery = useQuery({
    queryKey: [
      'expenses',
      page,
      search,
      categoryCode,
      paymentModeCode,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      expensesService.list({
        page,
        limit: 20,
        search: search || undefined,
        categoryCode: categoryCode || undefined,
        paymentModeCode: paymentModeCode || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
        sortOrder,
      }),
    enabled: !dateRangeError,
  });

  const expenses = listQuery.data?.items ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;
  const totalAmount = listQuery.data?.totalAmount ?? 0;
  const totalCount = listQuery.data?.total ?? 0;
  const hasFilters = Boolean(search || categoryCode || paymentModeCode || dateFrom || dateTo);

  const averageAmount = useMemo(() => {
    if (!totalCount) return 0;
    return totalAmount / totalCount;
  }, [totalAmount, totalCount]);

  const pageCategories = useMemo(() => {
    const map = new Map<string, { code: string; label: string; amount: number; count: number }>();
    for (const expense of expenses) {
      const current = map.get(expense.categoryCode) ?? {
        code: expense.categoryCode,
        label: expense.categoryLabel,
        amount: 0,
        count: 0,
      };
      current.amount += expense.amount;
      current.count += 1;
      map.set(expense.categoryCode, current);
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const pageCategoryMax = pageCategories[0]?.amount ?? 0;

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const toggleSort = (field: ExpenseSortField) => {
    setPage(1);
    if (sortBy === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortOrder(field === 'expenseDate' ? 'desc' : 'asc');
  };

  const openCreate = () => {
    setFormMode('create');
    setSelectedExpense(null);
    setFormOpen(true);
  };

  const openEdit = (expense: Expense) => {
    if (isSystemLinkedExpense(expense)) {
      setViewExpense(expense);
      return;
    }
    setFormMode('edit');
    setSelectedExpense(expense);
    setFormOpen(true);
  };

  const openArchive = (expense: Expense) => {
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

  const handleFormSubmit = (values: ExpenseFormValues) => {
    const payload = toExpensePayload(values);
    if (formMode === 'create') {
      createMutation.mutate(payload);
      return;
    }
    if (selectedExpense) {
      updateMutation.mutate({ id: selectedExpense.id, payload });
    }
  };

  return (
    <>
    <div className="dhara-exp">
      <div className="dhara-exp-ambient" aria-hidden>
        <span className="dhara-exp-orb is-maroon" />
        <span className="dhara-exp-orb is-gold" />
        <span className="dhara-exp-orb is-cyan" />
      </div>

      <section className="dhara-exp-hero">
        <span className="dhara-exp-lens" aria-hidden />
        <div>
          <p className="dhara-exp-kicker">Dhara Photography ERP Pro</p>
          <h2>Expenses Management</h2>
          <p className="dhara-exp-hero-copy">ખર્ચ — સ્ટુડિયો ખર્ચ અને વેન્ડર ચુકવણીનું કમાન્ડ સેન્ટર</p>
          {canCreate && (
            <div className="dhara-exp-hero-actions">
              <button
                type="button"
                className="dhara-exp-btn is-gold"
                data-robo-target="add-expense"
                onClick={openCreate}
              >
                <Plus />
                Add Expense
              </button>
            </div>
          )}
        </div>
        <div className="dhara-exp-hero-art">
          <span className="dhara-exp-hero-halo" aria-hidden />
          <ExpensesHeroArt />
        </div>
      </section>

      {feedback && (
        <div className={cn('dhara-exp-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
          {feedback.message}
        </div>
      )}

      <div className="dhara-exp-kpis">
        <article className="dhara-exp-kpi is-amber">
          <div className="dhara-exp-kpi-top">
            <div>
              <h3>Filtered Total</h3>
              <p>Matching current search and filters</p>
            </div>
            <span className="dhara-exp-icon">
              <TrendingDown />
            </span>
          </div>
          <strong>
            <AccountsCountUp value={totalAmount} />
          </strong>
        </article>
        <article className="dhara-exp-kpi is-gold">
          <div className="dhara-exp-kpi-top">
            <div>
              <h3>Entries</h3>
              <p>Active ledger rows in this filter</p>
            </div>
            <span className="dhara-exp-icon">
              <Hash />
            </span>
          </div>
          <strong>{totalCount}</strong>
        </article>
        <article className="dhara-exp-kpi is-rose">
          <div className="dhara-exp-kpi-top">
            <div>
              <h3>Average Amount</h3>
              <p>Filtered total ÷ entry count</p>
            </div>
            <span className="dhara-exp-icon">
              <Wallet />
            </span>
          </div>
          <strong>
            <AccountsCountUp value={averageAmount} />
          </strong>
        </article>
      </div>

      {expenses.length > 0 && pageCategories.length > 0 && (
        <section className="dhara-exp-card">
          <h3>Category mix on this page</h3>
          <p className="dhara-exp-note" style={{ marginTop: 0, marginBottom: '1rem' }}>
            Built only from the {expenses.length} loaded rows below — not a full-ledger chart.
          </p>
          <div className="dhara-exp-bars">
            {pageCategories.map((cat) => (
              <div key={cat.code} className="dhara-exp-bar">
                <span>{cat.label}</span>
                <div className="dhara-exp-bar-track">
                  <i
                    style={{
                      width: `${pageCategoryMax > 0 ? Math.max(8, (cat.amount / pageCategoryMax) * 100) : 8}%`,
                    }}
                  />
                </div>
                <strong className="dhara-exp-amt is-out">
                  {formatCurrency(cat.amount)} · {cat.count}
                </strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="dhara-exp-panel">
        <form onSubmit={handleSearchSubmit} className="dhara-exp-input-wrap" style={{ maxWidth: '36rem' }}>
          <Search />
          <input
            className="dhara-exp-input is-icon"
            placeholder="Search vendor, description, booking, or reference"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </form>

        <div className="dhara-exp-toolbar-row" style={{ marginTop: '1rem' }}>
          <div className="dhara-exp-field">
            <label htmlFor="expense-category-filter">Category</label>
            <select
              id="expense-category-filter"
              className="dhara-exp-input"
              value={categoryCode}
              onChange={(event) => {
                setPage(1);
                setCategoryCode(event.target.value);
              }}
            >
              <option value="">All categories</option>
              {categoryOptions.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="dhara-exp-field">
            <label htmlFor="expense-method-filter">Payment Method</label>
            <select
              id="expense-method-filter"
              className="dhara-exp-input"
              value={paymentModeCode}
              onChange={(event) => {
                setPage(1);
                setPaymentModeCode(event.target.value);
              }}
            >
              <option value="">All methods</option>
              {paymentModeOptions.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="dhara-exp-field">
            <label htmlFor="expense-date-from">From</label>
            <input
              id="expense-date-from"
              type="date"
              className="dhara-exp-input"
              value={dateFrom}
              onChange={(event) => {
                setPage(1);
                setDateFrom(event.target.value);
              }}
            />
          </div>
          <div className="dhara-exp-field">
            <label htmlFor="expense-date-to">To</label>
            <input
              id="expense-date-to"
              type="date"
              className="dhara-exp-input"
              value={dateTo}
              onChange={(event) => {
                setPage(1);
                setDateTo(event.target.value);
              }}
            />
          </div>
        </div>
      </section>

      {dateRangeError ? (
        <div className="dhara-exp-error">
          <Wallet />
          <p>{dateRangeError}</p>
        </div>
      ) : listQuery.isLoading ? (
        <div className="dhara-exp-kpis">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="dhara-exp-skeleton" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <div className="dhara-exp-error">
          <Wallet />
          <p>{getApiErrorMessage(listQuery.error, 'Failed to load expenses. Please try again.')}</p>
          <button type="button" className="dhara-exp-btn is-gold" onClick={() => void listQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : expenses.length === 0 ? (
        <div className="dhara-exp-empty">
          {hasFilters ? <Search /> : <Wallet />}
          <h3>{hasFilters ? 'No expenses match your search.' : 'No expenses yet.'}</h3>
          <p>
            {hasFilters
              ? 'Try a different vendor, category, payment method, or date range.'
              : 'Start the studio expense ledger by recording your first cost.'}
          </p>
          {canCreate && !hasFilters && (
            <button
              type="button"
              className="dhara-exp-btn is-gold"
              data-robo-target="add-expense"
              onClick={openCreate}
            >
              <Plus />
              Add Expense
            </button>
          )}
        </div>
      ) : (
        <div className="dhara-exp-card">
          <div className="dhara-exp-table-wrap">
            <table className="dhara-exp-table">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="dhara-exp-link"
                      style={{ marginTop: 0 }}
                      onClick={() => toggleSort('expenseDate')}
                    >
                      Date
                      <ArrowUpDown />
                    </button>
                  </th>
                  <th>Category</th>
                  <th>Vendor / Person</th>
                  <th>Description</th>
                  <th>Booking</th>
                  <th>Payment Method</th>
                  <th>Receipt / Ref</th>
                  <th>
                    <button
                      type="button"
                      className="dhara-exp-link"
                      style={{ marginTop: 0 }}
                      onClick={() => toggleSort('amount')}
                    >
                      Amount
                      <ArrowUpDown />
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.expenseDate}</td>
                    <td>
                      <span className={cn('dhara-exp-cat', expenseCategoryTone(expense.categoryCode))}>
                        {expense.categoryLabel}
                      </span>
                      <p className="dhara-exp-source">{getExpenseSourceLabel(getExpenseSource(expense))}</p>
                    </td>
                    <td>{expense.vendorPerson || '—'}</td>
                    <td>{expense.description || '—'}</td>
                    <td>{expense.bookingNumber || '—'}</td>
                    <td>{expense.paymentModeLabel || '—'}</td>
                    <td>{expense.referenceNumber || '—'}</td>
                    <td className="dhara-exp-amt is-out">{formatCurrency(expense.amount)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="dhara-exp-icon-btn"
                          onClick={() => setViewExpense(expense)}
                          aria-label="View expense"
                        >
                          <Eye />
                        </button>
                        {canUpdate && (
                          <button
                            type="button"
                            className="dhara-exp-icon-btn"
                            onClick={() => openEdit(expense)}
                            aria-label="Edit expense"
                          >
                            <Pencil />
                          </button>
                        )}
                        {canUpdate && (
                          <button
                            type="button"
                            className="dhara-exp-icon-btn"
                            onClick={() => openArchive(expense)}
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

          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between">
              <p className="dhara-exp-note">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="dhara-exp-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="dhara-exp-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="dhara-exp-note" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Receipt />
        Receipt files are not stored on the expense record. Use Receipt / Reference for bill or UTR
        numbers.
      </p>
    </div>

      <AddExpenseModal
        open={formOpen}
        mode={formMode}
        expense={selectedExpense}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setFormOpen(false);
          setSelectedExpense(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <ExpenseViewModal
        open={Boolean(viewExpense)}
        expense={viewExpense}
        canEdit={canUpdate}
        onClose={() => setViewExpense(null)}
        onEdit={(expense) => {
          setViewExpense(null);
          openEdit(expense);
        }}
      />

      <ArchiveExpenseDialog
        open={Boolean(archiveExpense)}
        expense={archiveExpense}
        isSubmitting={archiveMutation.isPending}
        onClose={() => setArchiveExpense(null)}
        onConfirm={() => {
          if (archiveExpense) {
            archiveMutation.mutate(archiveExpense.id);
          }
        }}
      />
    </>
  );
}

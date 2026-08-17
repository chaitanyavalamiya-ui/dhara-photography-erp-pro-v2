import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, Eye, Pencil, Plus, Receipt, Search, Trash2, Wallet } from 'lucide-react';
import { AddExpenseModal, ExpenseFormValues } from '@/components/accounts/AddExpenseModal';
import { ArchiveExpenseDialog } from '@/components/accounts/ArchiveExpenseDialog';
import { ExpenseViewModal } from '@/components/accounts/ExpenseViewModal';
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

type ExpenseSortField = 'expenseDate' | 'amount' | 'createdAt';

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
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-100">Expenses</h2>
          <p className="mt-1 text-sm text-gray-500">
            Record studio costs, vendor payments, and operational expenses against the live ledger.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            className="btn-primary"
            data-robo-target="add-expense"
            onClick={openCreate}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </button>
        )}
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

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card border-red-500/20 p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500">Filtered Total</p>
          <p className="mt-1 text-xl font-bold text-red-400">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="card border-gold/20 p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500">Entries</p>
          <p className="mt-1 text-xl font-bold text-gold">{totalCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500">Average Amount</p>
          <p className="mt-1 text-xl font-semibold text-gray-100">
            {formatCurrency(averageAmount)}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="mb-5 flex flex-col gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              className="input-field pl-10"
              placeholder="Search vendor, description, booking, or reference"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </form>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label
                className="mb-1.5 block text-xs text-gray-500"
                htmlFor="expense-category-filter"
              >
                Category
              </label>
              <select
                id="expense-category-filter"
                className="input-field"
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
            <div>
              <label className="mb-1.5 block text-xs text-gray-500" htmlFor="expense-method-filter">
                Payment Method
              </label>
              <select
                id="expense-method-filter"
                className="input-field"
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
            <div>
              <label className="mb-1.5 block text-xs text-gray-500" htmlFor="expense-date-from">
                From
              </label>
              <input
                id="expense-date-from"
                type="date"
                className="input-field"
                value={dateFrom}
                onChange={(event) => {
                  setPage(1);
                  setDateFrom(event.target.value);
                }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-500" htmlFor="expense-date-to">
                To
              </label>
              <input
                id="expense-date-to"
                type="date"
                className="input-field"
                value={dateTo}
                onChange={(event) => {
                  setPage(1);
                  setDateTo(event.target.value);
                }}
              />
            </div>
          </div>
        </div>

        {dateRangeError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
            {dateRangeError}
          </div>
        ) : listQuery.isLoading ? (
          <div className="flex min-h-48 items-center justify-center text-gray-500">
            Loading expenses...
          </div>
        ) : listQuery.isError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
            {getApiErrorMessage(listQuery.error, 'Failed to load expenses. Please try again.')}
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-surface-border px-6 py-10 text-center">
            {hasFilters ? (
              <Search className="mb-3 h-10 w-10 text-gray-600" />
            ) : (
              <Wallet className="mb-3 h-10 w-10 text-gray-600" />
            )}
            <h3 className="font-display text-lg font-semibold text-gray-200">
              {hasFilters ? 'No expenses match your search.' : 'No expenses yet.'}
            </h3>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              {hasFilters
                ? 'Try a different vendor, category, payment method, or date range.'
                : 'Start the studio expense ledger by recording your first cost.'}
            </p>
            {canCreate && !hasFilters && (
              <button
                type="button"
                className="btn-primary mt-5"
                data-robo-target="add-expense"
                onClick={openCreate}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-3 font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-gold"
                        onClick={() => toggleSort('expenseDate')}
                      >
                        Date
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="px-3 py-3 font-medium">Category</th>
                    <th className="px-3 py-3 font-medium">Vendor / Person</th>
                    <th className="px-3 py-3 font-medium">Description</th>
                    <th className="px-3 py-3 font-medium">Payment Method</th>
                    <th className="px-3 py-3 font-medium">Receipt / Ref</th>
                    <th className="px-3 py-3 font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-gold"
                        onClick={() => toggleSort('amount')}
                      >
                        Amount
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-surface-border/70 transition hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-4 text-gray-400">{expense.expenseDate}</td>
                      <td className="px-3 py-4">
                        <p className="text-gray-100">{expense.categoryLabel}</p>
                        <p className="text-xs text-gray-500">
                          {getExpenseSourceLabel(getExpenseSource(expense))}
                        </p>
                      </td>
                      <td className="px-3 py-4 text-gray-300">{expense.vendorPerson || '—'}</td>
                      <td className="px-3 py-4 text-gray-300">{expense.description || '—'}</td>
                      <td className="px-3 py-4 text-gray-400">{expense.paymentModeLabel || '—'}</td>
                      <td className="px-3 py-4 text-gray-400">{expense.referenceNumber || '—'}</td>
                      <td className="px-3 py-4 font-semibold text-red-400">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
                            onClick={() => setViewExpense(expense)}
                            aria-label="View expense"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canUpdate && (
                            <button
                              type="button"
                              className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
                              onClick={() => openEdit(expense)}
                              aria-label="Edit expense"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              type="button"
                              className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-red-400"
                              onClick={() => openArchive(expense)}
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
            </div>

            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between text-sm text-gray-400">
                <p>
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-gray-500">
        <Receipt className="h-3.5 w-3.5" />
        Receipt files are not stored on the expense record. Use Receipt / Reference for bill or UTR
        numbers.
      </p>

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
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { accountsService } from '@/services/accounts-service';
import { paymentsService, Payment } from '@/services/payments-service';
import { expensesService } from '@/services/expenses-service';
import { bookingsService } from '@/services/bookings-service';
import { useAuthStore } from '@/stores/auth-store';
import { AddPaymentModal } from '@/components/accounts/AddPaymentModal';
import { AddExpenseModal } from '@/components/accounts/AddExpenseModal';
import { PaymentReceiptModal } from '@/components/accounts/PaymentReceiptModal';
import { formatCurrency } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

type Tab = 'overview' | 'payments' | 'expenses' | 'transactions' | 'reports';

export function AccountsPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreatePayment = hasPermission('payments.create');
  const canCreateExpense = hasPermission('expenses.create');

  const [tab, setTab] = useState<Tab>('overview');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [profitBookingId, setProfitBookingId] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ['accounts', 'dashboard'],
    queryFn: accountsService.getDashboard,
  });

  const paymentsQuery = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsService.list({ limit: 20 }),
  });

  const expensesQuery = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expensesService.list({ limit: 20 }),
  });

  const transactionsQuery = useQuery({
    queryKey: ['accounts', 'transactions'],
    queryFn: accountsService.getTransactions,
  });

  const reportQuery = useQuery({
    queryKey: ['accounts', 'report', reportYear, reportMonth],
    queryFn: () => accountsService.getMonthlyReport(reportYear, reportMonth),
    enabled: tab === 'reports',
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'profit-select'],
    queryFn: () => bookingsService.list({ limit: 20 }),
  });

  const profitQuery = useQuery({
    queryKey: ['accounts', 'profit', profitBookingId],
    queryFn: () => accountsService.getBookingProfit(profitBookingId),
    enabled: Boolean(profitBookingId),
  });

  const paymentMutation = useMutation({
    mutationFn: paymentsService.create,
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setPaymentOpen(false);
      setReceiptPayment(payment);
      setFeedback({ type: 'success', message: 'Payment recorded successfully.' });
    },
    onError: (e: unknown) => setFeedback({ type: 'error', message: getApiErrorMessage(e, 'Failed to record payment.') }),
  });

  const expenseMutation = useMutation({
    mutationFn: expensesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setExpenseOpen(false);
      setFeedback({ type: 'success', message: 'Expense recorded successfully.' });
    },
    onError: (e: unknown) => setFeedback({ type: 'error', message: getApiErrorMessage(e, 'Failed to record expense.') }),
  });

  const dash = dashboardQuery.data;

  const summaryCards = dash
    ? [
        { label: 'Total Revenue', value: dash.totalRevenue, icon: TrendingUp, color: 'text-gold' },
        { label: 'Amount Received', value: dash.amountReceived, icon: ArrowDownLeft, color: 'text-green-400' },
        { label: 'Outstanding', value: dash.outstandingAmount, icon: Wallet, color: 'text-orange-400' },
        { label: 'Total Expenses', value: dash.totalExpenses, icon: ArrowUpRight, color: 'text-red-400' },
        { label: 'Net Profit', value: dash.netProfit, icon: TrendingUp, color: 'text-gold' },
        { label: 'This Month Revenue', value: dash.thisMonthRevenue, icon: TrendingUp, color: 'text-green-400' },
        { label: 'This Month Expenses', value: dash.thisMonthExpenses, icon: TrendingDown, color: 'text-red-400' },
        { label: 'This Month Profit', value: dash.thisMonthProfit, icon: TrendingUp, color: 'text-gold' },
      ]
    : [];

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'payments', label: 'Payments' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-100">Accounts</h2>
          <p className="mt-1 text-sm text-gray-500">Payments, expenses and studio profitability</p>
        </div>
        <div className="flex gap-2">
          {canCreatePayment && (
            <button type="button" className="btn-primary" onClick={() => setPaymentOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Add Payment
            </button>
          )}
          {canCreateExpense && (
            <button type="button" className="btn-secondary" onClick={() => setExpenseOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Add Expense
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={cn('rounded-lg border px-4 py-3 text-sm', feedback.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400')}>
          {feedback.message}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardQuery.isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card h-24 animate-pulse bg-surface-elevated" />
            ))
          : summaryCards.map((card) => (
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

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h3 className="mb-4 font-display text-lg font-semibold text-gold">Recent Payments</h3>
            <div className="space-y-2">
              {(paymentsQuery.data?.items ?? []).slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm">
                  <div>
                    <p className="text-gray-200">{p.clientName}</p>
                    <p className="text-xs text-gray-500">{p.invoiceNumber} · {p.paymentDate}</p>
                  </div>
                  <p className="font-semibold text-green-400">{formatCurrency(p.amount)}</p>
                </div>
              ))}
            </div>
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
                <option key={b.id} value={b.id}>{b.bookingNumber} — {b.client.fullName}</option>
              ))}
            </select>
            {profitQuery.data && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Revenue', formatCurrency(profitQuery.data.totalBookingAmount)],
                  ['Received', formatCurrency(profitQuery.data.totalReceived)],
                  ['Balance', formatCurrency(profitQuery.data.balance)],
                  ['Expenses', formatCurrency(profitQuery.data.totalExpenses)],
                  ['Net Profit', formatCurrency(profitQuery.data.netProfit)],
                  ['Margin', `${profitQuery.data.profitMarginPercent}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-surface-border bg-surface-elevated p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="mt-1 font-semibold text-gray-100">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Receipt</th>
                <th className="px-3 py-3">Client</th>
                <th className="px-3 py-3">Invoice</th>
                <th className="px-3 py-3">Method</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(paymentsQuery.data?.items ?? []).map((p) => (
                <tr key={p.id} className="border-b border-surface-border/70 hover:bg-white/[0.02]">
                  <td className="px-3 py-3 text-gray-400">{p.paymentDate}</td>
                  <td className="px-3 py-3 text-gray-300">{p.receiptNumber}</td>
                  <td className="px-3 py-3">{p.clientName}</td>
                  <td className="px-3 py-3 text-gray-300">{p.invoiceNumber}</td>
                  <td className="px-3 py-3 text-gray-400">{p.paymentModeLabel}</td>
                  <td className="px-3 py-3 font-semibold text-green-400">{formatCurrency(p.amount)}</td>
                  <td className="px-3 py-3">
                    <button type="button" className="text-gold hover:text-gold-light" onClick={() => setReceiptPayment(p)}>
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'expenses' && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">Booking</th>
                <th className="px-3 py-3">Vendor</th>
                <th className="px-3 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(expensesQuery.data?.items ?? []).map((e) => (
                <tr key={e.id} className="border-b border-surface-border/70 hover:bg-white/[0.02]">
                  <td className="px-3 py-3 text-gray-400">{e.expenseDate}</td>
                  <td className="px-3 py-3 text-gray-300">{e.categoryLabel}</td>
                  <td className="px-3 py-3">{e.description || '—'}</td>
                  <td className="px-3 py-3 text-gray-400">{e.bookingNumber || '—'}</td>
                  <td className="px-3 py-3 text-gray-400">{e.vendorPerson || '—'}</td>
                  <td className="px-3 py-3 font-semibold text-red-400">{formatCurrency(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="card overflow-x-auto">
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
              {(transactionsQuery.data ?? []).map((t) => (
                <tr key={`${t.type}-${t.id}`} className="border-b border-surface-border/70">
                  <td className="px-3 py-3 text-gray-400">{t.date}</td>
                  <td className="px-3 py-3 capitalize">{t.type}</td>
                  <td className="px-3 py-3">{t.description}</td>
                  <td className="px-3 py-3 text-gray-400">{t.clientName || '—'}</td>
                  <td className="px-3 py-3 text-green-400">{t.income > 0 ? formatCurrency(t.income) : '—'}</td>
                  <td className="px-3 py-3 text-red-400">{t.expense > 0 ? formatCurrency(t.expense) : '—'}</td>
                  <td className="px-3 py-3 font-medium text-gold">{formatCurrency(t.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'reports' && (
        <div className="card">
          <div className="mb-6 flex flex-wrap gap-3">
            <select className="input-field w-32" value={reportMonth} onChange={(e) => setReportMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>
              ))}
            </select>
            <select className="input-field w-28" value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))}>
              {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {reportQuery.data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Invoice Value', reportQuery.data.totalInvoiceValue],
                ['Payments Received', reportQuery.data.totalPaymentsReceived],
                ['Outstanding', reportQuery.data.totalOutstanding],
                ['Expenses', reportQuery.data.totalExpenses],
                ['Net Profit', reportQuery.data.netProfit],
                ['Bookings', reportQuery.data.bookingsCount],
                ['Paid Invoices', reportQuery.data.paidInvoicesCount],
                ['Partially Paid', reportQuery.data.partiallyPaidInvoicesCount],
                ['Unpaid', reportQuery.data.unpaidInvoicesCount],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-surface-border bg-surface-elevated p-4">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-gray-100">
                    {typeof value === 'number' && String(label) !== 'Bookings' && !String(label).includes('Invoices') && !String(label).includes('Paid') && !String(label).includes('Unpaid')
                      ? formatCurrency(value)
                      : value}
                  </p>
                </div>
              ))}
            </div>
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
        isSubmitting={expenseMutation.isPending}
        onClose={() => setExpenseOpen(false)}
        onSubmit={(values) =>
          expenseMutation.mutate({
            ...values,
            bookingId: values.bookingId || undefined,
            paymentModeCode: values.paymentModeCode || undefined,
          })
        }
      />

      <PaymentReceiptModal
        open={Boolean(receiptPayment)}
        payment={receiptPayment}
        onClose={() => setReceiptPayment(null)}
      />
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, FileText, Pencil, Plus, Search } from 'lucide-react';
import { INVOICE_STATUS_OPTIONS, Invoice, invoicesService } from '@/services/invoices-service';
import { Payment, paymentsService } from '@/services/payments-service';
import { useAuthStore } from '@/stores/auth-store';
import { AddPaymentModal } from '@/components/accounts/AddPaymentModal';
import { PaymentReceiptModal } from '@/components/accounts/PaymentReceiptModal';
import { GenerateInvoiceModal } from '@/components/invoices/GenerateInvoiceModal';
import { InvoiceViewModal } from '@/components/invoices/InvoiceViewModal';
import { EditInvoiceModal } from '@/components/invoices/EditInvoiceModal';
import { formatCurrency, formatDate } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { getInvoiceStatusClass, getInvoiceStatusLabel } from '@/utils/invoice';
import { cn } from '@/utils/cn';

export function InvoicesPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const canCreate = hasPermission('invoices.create');
  const canUpdate = hasPermission('invoices.update');
  const canCreatePayment = hasPermission('payments.create');

  const listQuery = useQuery({
    queryKey: ['invoices', page, search, statusFilter, dateFrom, dateTo],
    queryFn: () =>
      invoicesService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter as 'all' | Invoice['status'],
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const viewQuery = useQuery({
    queryKey: ['invoices', viewInvoiceId],
    queryFn: () => invoicesService.getById(viewInvoiceId!),
    enabled: Boolean(viewInvoiceId),
  });

  const createMutation = useMutation({
    mutationFn: ({ bookingId, notes }: { bookingId: string; notes?: string }) =>
      invoicesService.create({ bookingId, notes }),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setGenerateOpen(false);
      setViewInvoiceId(invoice.id);
      setFeedback({
        type: 'success',
        message: `Invoice ${invoice.invoiceNumber} generated successfully.`,
      });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to generate invoice.'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dueDate, notes }: { id: string; dueDate?: string; notes?: string }) =>
      invoicesService.update(id, {
        dueDate: dueDate || null,
        notes: notes || null,
      }),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setEditInvoice(null);
      setViewInvoiceId(invoice.id);
      setFeedback({ type: 'success', message: 'Invoice updated successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update invoice.'),
      });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: paymentsService.create,
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setPaymentInvoice(null);
      setViewInvoiceId(payment.invoiceId);
      setReceiptPayment(payment);
      setFeedback({ type: 'success', message: 'Payment recorded successfully.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to record payment.'),
      });
    },
  });

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const displayedInvoice = viewQuery.data ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-100">Invoices</h2>
          <p className="mt-1 text-sm text-gray-500">
            Generate and manage studio invoices from bookings.
          </p>
        </div>
        {canCreate && (
          <button type="button" className="btn-primary" data-robo-target="add-invoice" onClick={() => setGenerateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Invoice
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

      <div className="card border-gold/20">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15">
              <FileText className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-gold">Invoice Register</h3>
              <p className="text-sm text-gray-500">
                {listQuery.data?.total ?? 0} invoice{(listQuery.data?.total ?? 0) === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <form onSubmit={handleSearch} className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                className="input-field w-full pl-10 sm:w-64"
                placeholder="Invoice, booking, client..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </form>
            <select
              className="input-field w-full sm:w-40"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              {INVOICE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="input-field w-full sm:w-40"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
            <input
              type="date"
              className="input-field w-full sm:w-40"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {listQuery.isLoading ? (
          <div className="flex min-h-48 items-center justify-center text-gray-500">
            Loading invoices...
          </div>
        ) : listQuery.isError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
            Failed to load invoices.
          </div>
        ) : (listQuery.data?.items.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-dashed border-surface-border px-6 py-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-600" />
            <p className="mt-3 text-sm text-gray-400">No invoices found.</p>
            {canCreate && (
              <button
                type="button"
                className="btn-primary mt-4"
                onClick={() => setGenerateOpen(true)}
              >
                Generate from Booking
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-3 font-medium">Invoice #</th>
                    <th className="px-3 py-3 font-medium">Invoice Date</th>
                    <th className="px-3 py-3 font-medium">Booking #</th>
                    <th className="px-3 py-3 font-medium">Client</th>
                    <th className="px-3 py-3 font-medium">Total</th>
                    <th className="px-3 py-3 font-medium">Paid</th>
                    <th className="px-3 py-3 font-medium">Balance</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listQuery.data?.items.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-surface-border/70 transition hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-4 font-medium text-gold">{invoice.invoiceNumber}</td>
                      <td className="px-3 py-4 text-gray-400">{formatDate(invoice.invoiceDate)}</td>
                      <td className="px-3 py-4 text-gray-300">{invoice.bookingNumber}</td>
                      <td className="px-3 py-4">
                        <p className="text-gray-100">{invoice.clientName}</p>
                        <p className="text-xs text-gray-500">{invoice.clientMobile}</p>
                      </td>
                      <td className="px-3 py-4 font-medium text-gray-100">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="px-3 py-4 text-gray-300">
                        {formatCurrency(invoice.advanceAmount)}
                      </td>
                      <td className="px-3 py-4 font-semibold text-gold">
                        {formatCurrency(invoice.balanceAmount)}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-medium',
                            getInvoiceStatusClass(invoice.status),
                          )}
                        >
                          {getInvoiceStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="rounded-lg border border-surface-border p-1.5 text-gray-400 transition hover:border-gold/40 hover:text-gold"
                            title="View"
                            onClick={() => setViewInvoiceId(invoice.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canUpdate && (
                            <button
                              type="button"
                              className="rounded-lg border border-surface-border p-1.5 text-gray-400 transition hover:border-gold/40 hover:text-gold"
                              title="Edit"
                              onClick={async () => {
                                const full = await invoicesService.getById(invoice.id);
                                setEditInvoice(full);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(listQuery.data?.totalPages ?? 1) > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-surface-border pt-4">
                <p className="text-sm text-gray-500">
                  Page {listQuery.data?.page} of {listQuery.data?.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs"
                    disabled={page >= (listQuery.data?.totalPages ?? 1)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <GenerateInvoiceModal
        open={generateOpen}
        isSubmitting={createMutation.isPending}
        onClose={() => setGenerateOpen(false)}
        onGenerate={(bookingId, notes) => createMutation.mutate({ bookingId, notes })}
      />

      <InvoiceViewModal
        open={Boolean(viewInvoiceId)}
        invoice={displayedInvoice}
        loading={viewQuery.isLoading}
        error={viewQuery.isError}
        canUpdate={canUpdate}
        canCreatePayment={canCreatePayment}
        onClose={() => setViewInvoiceId(null)}
        onEdit={(invoice) => {
          setViewInvoiceId(null);
          setEditInvoice(invoice);
        }}
        onAddPayment={(invoice) => setPaymentInvoice(invoice)}
      />

      <EditInvoiceModal
        open={Boolean(editInvoice)}
        invoice={editInvoice}
        isSubmitting={updateMutation.isPending}
        onClose={() => setEditInvoice(null)}
        onSubmit={(values) => {
          if (editInvoice) {
            updateMutation.mutate({ id: editInvoice.id, ...values });
          }
        }}
      />

      <AddPaymentModal
        open={Boolean(paymentInvoice)}
        isSubmitting={paymentMutation.isPending}
        prefillInvoiceId={paymentInvoice?.id}
        onClose={() => setPaymentInvoice(null)}
        onSubmit={(values) => paymentMutation.mutate(values)}
      />

      <PaymentReceiptModal
        open={Boolean(receiptPayment)}
        payment={receiptPayment}
        onClose={() => setReceiptPayment(null)}
      />
    </div>
  );
}

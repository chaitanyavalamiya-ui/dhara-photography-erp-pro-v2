/**
 * LOCKED APPROVED BASELINE:
 * Do not modify this Invoice module without an explicit user request.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Eye,
  FileText,
  IndianRupee,
  Pencil,
  Plus,
  Search,
  Wallet,
} from 'lucide-react';
import { INVOICE_STATUS_OPTIONS, Invoice, invoicesService } from '@/services/invoices-service';
import { Payment, paymentsService } from '@/services/payments-service';
import { useAuthStore } from '@/stores/auth-store';
import { AddPaymentModal } from '@/components/accounts/AddPaymentModal';
import { PaymentReceiptModal } from '@/components/accounts/PaymentReceiptModal';
import { GenerateInvoiceModal } from '@/components/invoices/GenerateInvoiceModal';
import { InvoiceViewModal } from '@/components/invoices/InvoiceViewModal';
import { EditInvoiceModal } from '@/components/invoices/EditInvoiceModal';
import { invoiceStatusTone } from '@/components/invoices/invoice-visual';
import { formatCurrency, formatDate } from '@/utils/booking-form';
import { getApiErrorMessage } from '@/utils/api-error';
import { getInvoiceStatusLabel } from '@/utils/invoice';
import { cn } from '@/utils/cn';
import './invoices/invoices-page.css';

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
  const canVoidPayment = hasPermission('payments.update');

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
    mutationFn: ({
      bookingId,
      notes,
      deliverables,
    }: {
      bookingId: string;
      notes?: string;
      deliverables?: { items: string[]; videoMedia?: '' | 'pendrive' | 'hard_disk' };
    }) => invoicesService.create({ bookingId, notes, deliverables }),
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
    mutationFn: ({
      id,
      dueDate,
      notes,
      deliverables,
    }: {
      id: string;
      dueDate?: string;
      notes?: string;
      deliverables?: { items: string[]; videoMedia?: '' | 'pendrive' | 'hard_disk' };
    }) =>
      invoicesService.update(id, {
        dueDate: dueDate || null,
        notes: notes || null,
        deliverables,
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
  const pageItems = listQuery.data?.items ?? [];
  const pageInvoiced = pageItems.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const pagePaid = pageItems.reduce((sum, invoice) => sum + invoice.advanceAmount, 0);
  const pagePending = pageItems.reduce((sum, invoice) => sum + invoice.balanceAmount, 0);

  return (
    <div className="dhara-inv">
      <section className="dhara-inv-hero">
        <div>
          <p className="dhara-inv-kicker">DHARA PHOTOGRAPHY ERP PRO</p>
          <h2>Invoice Management</h2>
          <p className="dhara-inv-hero-copy">
            સ્ટુડિયોના બિલ, ચુકવણી અને બાકી રકમનું રાજસી અને સ્પષ્ટ વ્યવસ્થાપન.
          </p>
        </div>
        <div className="dhara-inv-hero-art" aria-hidden>
          <svg viewBox="0 0 120 120" fill="none">
            <rect x="28" y="18" width="64" height="84" rx="10" stroke="#ffd45a" strokeWidth="2.4" />
            <path d="M40 38h40" stroke="#ffe7b8" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M40 52h28" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
            <path d="M40 66h34" stroke="#ff4ec8" strokeWidth="2" strokeLinecap="round" />
            <rect x="40" y="80" width="22" height="10" rx="3" fill="rgba(255,212,90,0.28)" stroke="#ffd45a" />
          </svg>
        </div>
      </section>

      <div className="dhara-inv-kpis">
        <article className="dhara-inv-kpi is-gold">
          <div className="dhara-inv-kpi-top">
            <h3>Invoice Count</h3>
            <span className="dhara-inv-icon">
              <FileText strokeWidth={2.35} absoluteStrokeWidth />
            </span>
          </div>
          <strong>{listQuery.isLoading ? '—' : listQuery.data?.total ?? 0}</strong>
        </article>
        <article className="dhara-inv-kpi is-cyan">
          <div className="dhara-inv-kpi-top">
            <h3>Invoiced On This Page</h3>
            <span className="dhara-inv-icon">
              <IndianRupee strokeWidth={2.35} absoluteStrokeWidth />
            </span>
          </div>
          <strong>{listQuery.isLoading ? '—' : formatCurrency(pageInvoiced)}</strong>
        </article>
        <article className="dhara-inv-kpi is-green">
          <div className="dhara-inv-kpi-top">
            <h3>Paid On This Page</h3>
            <span className="dhara-inv-icon">
              <Wallet strokeWidth={2.35} absoluteStrokeWidth />
            </span>
          </div>
          <strong>{listQuery.isLoading ? '—' : formatCurrency(pagePaid)}</strong>
        </article>
        <article className="dhara-inv-kpi is-amber">
          <div className="dhara-inv-kpi-top">
            <h3>Pending On This Page</h3>
            <span className="dhara-inv-icon">
              <IndianRupee strokeWidth={2.35} absoluteStrokeWidth />
            </span>
          </div>
          <strong>{listQuery.isLoading ? '—' : formatCurrency(pagePending)}</strong>
        </article>
      </div>

      {feedback && (
        <div className={cn('dhara-inv-flash', feedback.type === 'success' ? 'is-ok' : 'is-bad')}>
          {feedback.message}
        </div>
      )}

      <form className="dhara-inv-panel dhara-inv-toolbar" onSubmit={handleSearch}>
        <div className="dhara-inv-field is-search">
          <label htmlFor="invoice-search">Search</label>
          <div className="dhara-inv-input-wrap">
            <Search aria-hidden />
            <input
              id="invoice-search"
              className="dhara-inv-input is-icon"
              placeholder="Invoice, booking, client..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </div>
        <div className="dhara-inv-field">
          <label htmlFor="invoice-status">Status</label>
          <select
            id="invoice-status"
            className="input-field"
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
        </div>
        <div className="dhara-inv-field">
          <label htmlFor="invoice-date-from">From</label>
          <input
            id="invoice-date-from"
            type="date"
            className="input-field"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="dhara-inv-field">
          <label htmlFor="invoice-date-to">To</label>
          <input
            id="invoice-date-to"
            type="date"
            className="input-field"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <button type="submit" className="dhara-inv-btn is-cyan">
          Search
        </button>
        {canCreate && (
          <button
            type="button"
            className="dhara-inv-btn is-gold"
            data-robo-target="add-invoice"
            onClick={() => setGenerateOpen(true)}
          >
            <Plus strokeWidth={2.5} absoluteStrokeWidth />
            Generate Invoice
          </button>
        )}
      </form>

      <section className="dhara-inv-panel dhara-inv-register">
        {listQuery.isLoading ? (
          <div className="dhara-inv-empty">
            <p>Loading invoices...</p>
          </div>
        ) : listQuery.isError ? (
          <div className="dhara-inv-error">
            <AlertCircle strokeWidth={2.4} absoluteStrokeWidth />
            <p>Failed to load invoices.</p>
            <button type="button" className="dhara-inv-btn is-cyan" onClick={() => void listQuery.refetch()}>
              Retry
            </button>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="dhara-inv-empty">
            <FileText strokeWidth={2.4} absoluteStrokeWidth />
            <p>No invoices found.</p>
            {canCreate && (
              <button type="button" className="dhara-inv-btn is-gold" onClick={() => setGenerateOpen(true)}>
                Generate from Booking
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="dhara-inv-table-wrap">
              <table className="dhara-inv-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Invoice Date</th>
                    <th>Booking #</th>
                    <th>Client</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="dhara-inv-number">{invoice.invoiceNumber}</td>
                      <td>{formatDate(invoice.invoiceDate)}</td>
                      <td>{invoice.bookingNumber}</td>
                      <td>
                        <p className="dhara-inv-client">{invoice.clientName}</p>
                        <p className="dhara-inv-client-sub">{invoice.clientMobile}</p>
                      </td>
                      <td className="dhara-inv-money">{formatCurrency(invoice.totalAmount)}</td>
                      <td className="dhara-inv-money is-paid">{formatCurrency(invoice.advanceAmount)}</td>
                      <td className="dhara-inv-money is-due">{formatCurrency(invoice.balanceAmount)}</td>
                      <td>
                        <span className={cn('dhara-inv-status', invoiceStatusTone(invoice.status))}>
                          {getInvoiceStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td>
                        <div className="dhara-inv-actions">
                          <button
                            type="button"
                            className="dhara-inv-icon-btn"
                            title="View"
                            aria-label="View"
                            onClick={() => setViewInvoiceId(invoice.id)}
                          >
                            <Eye strokeWidth={2.4} absoluteStrokeWidth />
                          </button>
                          {canUpdate && (
                            <button
                              type="button"
                              className="dhara-inv-icon-btn"
                              title="Edit"
                              aria-label="Edit invoice"
                              onClick={async () => {
                                const full = await invoicesService.getById(invoice.id);
                                setEditInvoice(full);
                              }}
                            >
                              <Pencil strokeWidth={2.4} absoluteStrokeWidth />
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
              <div className="dhara-inv-pager">
                <span>
                  Page {listQuery.data?.page} of {listQuery.data?.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="dhara-inv-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="dhara-inv-btn"
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
      </section>

      <GenerateInvoiceModal
        open={generateOpen}
        isSubmitting={createMutation.isPending}
        onClose={() => setGenerateOpen(false)}
        onGenerate={(bookingId, payload) => createMutation.mutate({ bookingId, ...payload })}
      />

      <InvoiceViewModal
        open={Boolean(viewInvoiceId)}
        invoice={displayedInvoice}
        loading={viewQuery.isLoading}
        error={viewQuery.isError}
        canUpdate={canUpdate}
        canCreatePayment={canCreatePayment}
        canVoidPayment={canVoidPayment}
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

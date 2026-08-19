import { useState } from 'react';
import { Download, MessageCircle, Pencil, Plus, Printer, Share2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Invoice } from '@/services/invoices-service';
import { Payment, paymentsService } from '@/services/payments-service';
import { InvoiceDocument } from '@/components/invoices/InvoiceDocument';
import { InvoicePaymentHistory } from '@/components/invoices/InvoicePaymentHistory';
import { AddPaymentModal } from '@/components/accounts/AddPaymentModal';
import { buildWhatsAppShareUrl, printInvoice } from '@/utils/invoice';
import { downloadInvoicePdf } from '@/utils/invoice-pdf';
import { getApiErrorMessage } from '@/utils/api-error';

interface InvoiceViewModalProps {
  open: boolean;
  invoice: Invoice | null;
  loading?: boolean;
  error?: boolean;
  canUpdate?: boolean;
  canCreatePayment?: boolean;
  canVoidPayment?: boolean;
  onClose: () => void;
  onEdit: (invoice: Invoice) => void;
  onAddPayment?: (invoice: Invoice) => void;
}

export function InvoiceViewModal({
  open,
  invoice,
  loading,
  error,
  canUpdate,
  canCreatePayment,
  canVoidPayment,
  onClose,
  onEdit,
  onAddPayment,
}: InvoiceViewModalProps) {
  const queryClient = useQueryClient();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const paymentsQuery = useQuery({
    queryKey: ['payments', 'invoice', invoice?.id],
    queryFn: () => paymentsService.list({ invoiceId: invoice!.id, limit: 100 }),
    enabled: open && Boolean(invoice?.id),
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({
      paymentId,
      payload,
    }: {
      paymentId: string;
      payload: Parameters<typeof paymentsService.update>[1];
    }) => paymentsService.update(paymentId, payload),
    onSuccess: () => {
      setEditPayment(null);
      setEditError(null);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (error: unknown) => {
      setEditError(getApiErrorMessage(error, 'Failed to update payment.'));
    },
  });

  const voidMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsService.void(paymentId),
    onSuccess: () => {
      setVoidTarget(null);
      setVoidError(null);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (error: unknown) => {
      setVoidError(getApiErrorMessage(error, 'Failed to void payment.'));
    },
  });

  if (!open) return null;

  const handlePrint = () => {
    if (!invoice) return;
    printInvoice('invoice-document-print');
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setPdfError(null);
    setIsDownloadingPdf(true);
    try {
      await downloadInvoicePdf(
        'invoice-document-print',
        invoice.invoiceNumber,
        invoice.client.fullName,
      );
    } catch (error) {
      setPdfError(
        error instanceof Error ? error.message : 'Failed to generate the invoice PDF.',
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleShare = async () => {
    if (!invoice) return;
    const shareData = {
      title: `Invoice ${invoice.invoiceNumber}`,
      text: `Invoice ${invoice.invoiceNumber} — ${invoice.client.fullName}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(
      `${shareData.text}\nTotal: ₹${invoice.totalAmount}\nBalance: ₹${invoice.balanceAmount}`,
    );
  };

  const handleWhatsApp = () => {
    if (!invoice) return;
    window.open(buildWhatsAppShareUrl(invoice), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-surface-border px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">Invoice Preview</p>
            <h2 className="font-display text-xl font-semibold text-gold">
              {invoice?.invoiceNumber ?? 'Loading…'}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {invoice && canCreatePayment && invoice.balanceAmount > 0 && onAddPayment && (
              <button
                type="button"
                className="btn-primary px-3 py-1.5 text-xs"
                onClick={() => onAddPayment(invoice)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Payment
              </button>
            )}
            {invoice && canUpdate && (
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs"
                onClick={() => onEdit(invoice)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              disabled={!invoice}
              onClick={handlePrint}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              disabled={!invoice || isDownloadingPdf}
              onClick={() => void handleDownloadPdf()}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {isDownloadingPdf ? 'PDF…' : 'PDF'}
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              disabled={!invoice}
              onClick={() => void handleShare()}
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              disabled={!invoice}
              onClick={handleWhatsApp}
            >
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        {pdfError && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-2 text-sm text-red-400">
            {pdfError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-gray-200/10 p-6">
          {loading && (
            <div className="flex min-h-48 items-center justify-center text-gray-500">
              Loading invoice...
            </div>
          )}
          {error && !loading && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
              Failed to load invoice details.
            </div>
          )}
          {invoice && (
            <div className="space-y-6">
              <InvoiceDocument invoice={invoice} id="invoice-document-print" />
              <InvoicePaymentHistory
                payments={paymentsQuery.data?.items ?? []}
                isLoading={paymentsQuery.isLoading}
                isError={paymentsQuery.isError}
                canVoid={canVoidPayment}
                canEdit={canVoidPayment}
                isVoidingId={voidMutation.isPending ? voidTarget?.id ?? null : null}
                onVoid={
                  canVoidPayment
                    ? (payment) => {
                        setVoidError(null);
                        setVoidTarget(payment);
                      }
                    : undefined
                }
                onEdit={
                  canVoidPayment
                    ? (payment) => {
                        setEditError(null);
                        setEditPayment(payment);
                      }
                    : undefined
                }
              />
              {voidTarget && canVoidPayment && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <p>
                    Void receipt {voidTarget.receiptNumber ?? voidTarget.id}? The original record is
                    kept, but it will no longer count as income.
                  </p>
                  {voidError && <p className="mt-2 text-red-400">{voidError}</p>}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="btn-secondary px-3 py-1.5 text-xs"
                      onClick={() => {
                        setVoidTarget(null);
                        setVoidError(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-red-500/80 px-3 py-1.5 text-xs font-medium text-white"
                      disabled={voidMutation.isPending}
                      onClick={() => voidMutation.mutate(voidTarget.id)}
                    >
                      Confirm void
                    </button>
                  </div>
                </div>
              )}
              {editError && (
                <p className="text-sm text-red-400">{editError}</p>
              )}
            </div>
          )}
        </div>
      </div>
      <AddPaymentModal
        open={Boolean(editPayment)}
        payment={editPayment}
        isSubmitting={updatePaymentMutation.isPending}
        onClose={() => {
          setEditPayment(null);
          setEditError(null);
        }}
        onSubmit={(values) => {
          if (!editPayment) return;
          updatePaymentMutation.mutate({
            paymentId: editPayment.id,
            payload: {
              amount: values.amount,
              paymentModeCode: values.paymentModeCode,
              paymentDate: values.paymentDate,
              transactionReference: values.transactionReference || null,
              notes: values.notes || null,
            },
          });
        }}
      />
    </div>
  );
}

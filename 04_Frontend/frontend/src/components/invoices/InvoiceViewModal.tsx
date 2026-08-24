import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Download, MessageCircle, Pencil, Plus, Printer, Share2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Invoice } from '@/services/invoices-service';
import { Payment, paymentsService } from '@/services/payments-service';
import { InvoiceDocument } from '@/components/invoices/InvoiceDocument';
import { InvoicePaymentHistory } from '@/components/invoices/InvoicePaymentHistory';
import { AddPaymentModal } from '@/components/accounts/AddPaymentModal';
import { isShareAbortError, printInvoice, shareInvoicePdfFile } from '@/utils/invoice';
import { downloadInvoicePdf, generateInvoicePdfBlob, triggerPdfFileDownload } from '@/utils/invoice-pdf';
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
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfReadyMessage, setPdfReadyMessage] = useState<string | null>(null);
  const pdfRequestIdRef = useRef(0);
  const whatsappRequestIdRef = useRef(0);
  const [isPreparingWhatsAppPdf, setIsPreparingWhatsAppPdf] = useState(false);
  const pdfCacheRef = useRef<{ invoiceId: string; blob: Blob; filename: string } | null>(null);
  const prefetchPromiseRef = useRef<Promise<{ blob: Blob; filename: string }> | null>(null);
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const previewBodyRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (open) {
      return;
    }
    pdfRequestIdRef.current += 1;
    whatsappRequestIdRef.current += 1;
    setIsDownloadingPdf(false);
    setIsSendingWhatsApp(false);
    setIsPreparingWhatsAppPdf(false);
    pdfCacheRef.current = null;
    prefetchPromiseRef.current = null;
    setPdfError(null);
    setPdfReadyMessage(null);
  }, [open]);

  useEffect(() => {
    if (!open || !invoice) {
      pdfCacheRef.current = null;
      prefetchPromiseRef.current = null;
      setIsPreparingWhatsAppPdf(false);
      return;
    }

    const invoiceId = invoice.id;
    const invoiceNumber = invoice.invoiceNumber;
    const clientName = invoice.client.fullName;
    setIsPreparingWhatsAppPdf(true);
    const promise = generateInvoicePdfBlob('invoice-document-print', invoiceNumber, clientName).then(
      (result) => {
        pdfCacheRef.current = { invoiceId, ...result };
        return result;
      },
    );
    prefetchPromiseRef.current = promise;
    void promise.finally(() => {
      if (prefetchPromiseRef.current === promise) {
        setIsPreparingWhatsAppPdf(false);
      }
    });

    return () => {
      if (prefetchPromiseRef.current === promise) {
        prefetchPromiseRef.current = null;
      }
    };
  }, [open, invoice?.id, invoice?.invoiceNumber, invoice?.client.fullName]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const body = previewBodyRef.current;
    if (body) {
      body.scrollTop = 0;
    }
  }, [open, invoice?.id]);

  if (!open) return null;

  const handlePrint = () => {
    if (!invoice) return;
    printInvoice('invoice-document-print');
  };

  const pdfBusy = isDownloadingPdf || isSendingWhatsApp;

  const handleDownloadPdf = async () => {
    if (!invoice || pdfBusy) return;
    const requestId = pdfRequestIdRef.current + 1;
    pdfRequestIdRef.current = requestId;
    setPdfError(null);
    setPdfReadyMessage(null);
    setIsDownloadingPdf(true);
    try {
      await downloadInvoicePdf(
        'invoice-document-print',
        invoice.invoiceNumber,
        invoice.client.fullName,
      );
      if (requestId !== pdfRequestIdRef.current) return;
      setPdfReadyMessage(
        'Invoice PDF generated. Your browser should start the download.',
      );
    } catch (error) {
      if (requestId !== pdfRequestIdRef.current) return;
      setPdfError(
        error instanceof Error ? error.message : 'Failed to generate the invoice PDF.',
      );
    } finally {
      if (requestId === pdfRequestIdRef.current) {
        setIsDownloadingPdf(false);
      }
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

  const handleWhatsApp = async () => {
    if (!invoice || pdfBusy || isPreparingWhatsAppPdf) return;
    const requestId = whatsappRequestIdRef.current + 1;
    whatsappRequestIdRef.current = requestId;
    setPdfError(null);
    setPdfReadyMessage(null);
    setIsSendingWhatsApp(true);
    try {
      const cached = pdfCacheRef.current;
      const prepared =
        cached?.invoiceId === invoice.id
          ? { blob: cached.blob, filename: cached.filename }
          : await (prefetchPromiseRef.current ??
              generateInvoicePdfBlob(
                'invoice-document-print',
                invoice.invoiceNumber,
                invoice.client.fullName,
              ));
      if (requestId !== whatsappRequestIdRef.current) return;

      pdfCacheRef.current = { invoiceId: invoice.id, ...prepared };
      const file = new File([prepared.blob], prepared.filename, { type: 'application/pdf' });
      try {
        await shareInvoicePdfFile(file, `Invoice ${invoice.invoiceNumber}`);
        if (requestId !== whatsappRequestIdRef.current) return;
        setPdfReadyMessage('Invoice PDF ready. Choose WhatsApp to send the file.');
      } catch (error) {
        if (isShareAbortError(error)) {
          return;
        }
        triggerPdfFileDownload(prepared.blob, prepared.filename);
        if (requestId !== whatsappRequestIdRef.current) return;
        setPdfReadyMessage(
          'Invoice PDF saved. Open WhatsApp and send this PDF to the client.',
        );
      }
    } catch (error) {
      if (requestId !== whatsappRequestIdRef.current) return;
      setPdfError(
        error instanceof Error ? error.message : 'Failed to prepare the invoice PDF for WhatsApp.',
      );
    } finally {
      if (requestId === whatsappRequestIdRef.current) {
        setIsSendingWhatsApp(false);
      }
    }
  };

  return (
    <div className="dhara-inv-modal is-preview">
      <div className="dhara-inv-modal-card is-wide">
        <div className="dhara-inv-modal-head">
          <div>
            <p>Invoice Preview</p>
            <h2>{invoice?.invoiceNumber ?? 'Loading…'}</h2>
          </div>
          <div className="dhara-inv-modal-actions">
            {invoice && canCreatePayment && invoice.balanceAmount > 0 && onAddPayment && (
              <button
                type="button"
                className="dhara-inv-btn is-gold"
                onClick={() => onAddPayment(invoice)}
              >
                <Plus strokeWidth={2.4} absoluteStrokeWidth />
                Add Payment
              </button>
            )}
            {invoice && canUpdate && (
              <button type="button" className="dhara-inv-btn is-cyan" onClick={() => onEdit(invoice)}>
                <Pencil strokeWidth={2.4} absoluteStrokeWidth />
                Edit
              </button>
            )}
            <button type="button" className="dhara-inv-btn" disabled={!invoice} onClick={handlePrint}>
              <Printer strokeWidth={2.4} absoluteStrokeWidth />
              Print
            </button>
            <button
              type="button"
              className="dhara-inv-btn"
              disabled={!invoice || pdfBusy}
              onClick={() => void handleDownloadPdf()}
            >
              <Download strokeWidth={2.4} absoluteStrokeWidth />
              {isDownloadingPdf ? 'Preparing PDF…' : 'PDF'}
            </button>
            <button type="button" className="dhara-inv-btn" disabled={!invoice} onClick={() => void handleShare()}>
              <Share2 strokeWidth={2.4} absoluteStrokeWidth />
              Share
            </button>
            <button
              type="button"
              className="dhara-inv-btn"
              disabled={!invoice || pdfBusy || isPreparingWhatsAppPdf}
              onClick={() => void handleWhatsApp()}
            >
              <MessageCircle strokeWidth={2.4} absoluteStrokeWidth />
              {isSendingWhatsApp ? 'Sending…' : 'WhatsApp'}
            </button>
            <button type="button" onClick={onClose} className="dhara-inv-icon-btn" aria-label="Close">
              <X strokeWidth={2.4} absoluteStrokeWidth />
            </button>
          </div>
        </div>
        {(pdfError || pdfReadyMessage) && (
          <div
            className={`dhara-inv-flash ${pdfError ? 'is-bad' : 'is-ok'}`}
            style={{ borderRadius: 0 }}
            role="status"
            aria-live="polite"
          >
            {pdfError ?? pdfReadyMessage}
          </div>
        )}

        <div className="dhara-inv-modal-body" ref={previewBodyRef}>
          {loading && (
            <div className="dhara-inv-empty">
              <p>Loading invoice...</p>
            </div>
          )}
          {error && !loading && (
            <div className="dhara-inv-error">
              <p>Failed to load invoice details.</p>
            </div>
          )}
          {invoice && (
            <div className="dhara-inv-preview-stack">
              <div className="dhara-inv-preview-fit">
                <InvoiceDocument invoice={invoice} id="invoice-document-print" />
              </div>
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
                <div className="dhara-inv-void">
                  <p>
                    Void receipt {voidTarget.receiptNumber ?? voidTarget.id}? The original record is
                    kept, but it will no longer count as income.
                  </p>
                  {voidError && <p className="mt-2">{voidError}</p>}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="dhara-inv-btn"
                      onClick={() => {
                        setVoidTarget(null);
                        setVoidError(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="dhara-inv-btn is-danger"
                      disabled={voidMutation.isPending}
                      onClick={() => voidMutation.mutate(voidTarget.id)}
                    >
                      Confirm void
                    </button>
                  </div>
                </div>
              )}
              {editError && <p className="dhara-inv-flash is-bad">{editError}</p>}
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

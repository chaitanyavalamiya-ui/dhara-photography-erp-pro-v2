import { useState } from 'react';
import { Download, MessageCircle, Printer, X } from 'lucide-react';
import { Payment } from '@/services/payments-service';
import {
  buildPaymentWhatsAppUrl,
  PaymentReceiptDocument,
  printPaymentReceipt,
} from '@/components/accounts/PaymentReceiptDocument';
import { downloadPaymentReceiptPdf } from '@/utils/payment-receipt-pdf';

interface PaymentReceiptModalProps {
  open: boolean;
  payment: Payment | null;
  onClose: () => void;
}

export function PaymentReceiptModal({ open, payment, onClose }: PaymentReceiptModalProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  if (!open || !payment) return null;

  const handleDownloadPdf = async () => {
    setPdfError(null);
    setIsDownloadingPdf(true);
    try {
      await downloadPaymentReceiptPdf(
        'payment-receipt-document',
        payment.receiptNumber,
        payment.clientName,
      );
    } catch (error) {
      setPdfError(
        error instanceof Error ? error.message : 'Failed to generate the receipt PDF.',
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-card">
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-gold">Payment Receipt</h2>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => printPaymentReceipt('payment-receipt-document')}>
              <Printer className="mr-1 inline h-3.5 w-3.5" />Print
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              disabled={isDownloadingPdf}
              onClick={() => void handleDownloadPdf()}
            >
              <Download className="mr-1 inline h-3.5 w-3.5" />
              {isDownloadingPdf ? 'PDF…' : 'PDF'}
            </button>
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => window.open(buildPaymentWhatsAppUrl(payment), '_blank')}>
              <MessageCircle className="mr-1 inline h-3.5 w-3.5" />WhatsApp
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-gold">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        {pdfError && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-2 text-sm text-red-400">
            {pdfError}
          </div>
        )}
        <div className="overflow-y-auto bg-gray-200/10 p-6">
          <PaymentReceiptDocument payment={payment} />
        </div>
      </div>
    </div>
  );
}

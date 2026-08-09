import { Download, MessageCircle, Pencil, Printer, Share2, X } from 'lucide-react';
import { Invoice } from '@/services/invoices-service';
import { InvoiceDocument } from '@/components/invoices/InvoiceDocument';
import { buildWhatsAppShareUrl, printInvoice } from '@/utils/invoice';

interface InvoiceViewModalProps {
  open: boolean;
  invoice: Invoice | null;
  canUpdate?: boolean;
  onClose: () => void;
  onEdit: (invoice: Invoice) => void;
}

export function InvoiceViewModal({
  open,
  invoice,
  canUpdate,
  onClose,
  onEdit,
}: InvoiceViewModalProps) {
  if (!open || !invoice) return null;

  const handlePrint = () => printInvoice('invoice-document-print');
  const handleDownloadPdf = () => printInvoice('invoice-document-print');
  const handleShare = async () => {
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
    window.open(buildWhatsAppShareUrl(invoice), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-surface-border px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">Invoice Preview</p>
            <h2 className="font-display text-xl font-semibold text-gold">{invoice.invoiceNumber}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canUpdate && (
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs"
                onClick={() => onEdit(invoice)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={handlePrint}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              onClick={handleDownloadPdf}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </button>
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={handleShare}>
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share
            </button>
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={handleWhatsApp}>
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

        <div className="flex-1 overflow-y-auto bg-gray-200/10 p-6">
          <InvoiceDocument invoice={invoice} id="invoice-document-print" />
        </div>
      </div>
    </div>
  );
}

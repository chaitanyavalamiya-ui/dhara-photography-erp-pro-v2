import { jsPDF } from 'jspdf';
import {
  addPaginatedCanvasToPdf,
  captureHtmlElementForPdf,
  createInvoicePdfCaptureTarget,
  sanitizePdfFilenamePart,
  triggerPdfFileDownload,
} from '@/utils/invoice-pdf';

export async function createPaymentReceiptPdfCaptureTarget(source: HTMLElement) {
  return createInvoicePdfCaptureTarget(source);
}

export function buildPaymentReceiptPdfFilename(
  receiptNumber?: string | null,
  clientName?: string | null,
): string {
  const parts = [receiptNumber, clientName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .map(sanitizePdfFilenamePart);

  return `${parts.join('-') || 'receipt'}.pdf`;
}

export async function downloadPaymentReceiptPdf(
  elementId: string,
  receiptNumber?: string | null,
  clientName?: string | null,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Receipt document not found.');
  }

  try {
    const canvas = await captureHtmlElementForPdf(element);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    addPaginatedCanvasToPdf(pdf, canvas);

    const blob = pdf.output('blob');
    triggerPdfFileDownload(blob, buildPaymentReceiptPdfFilename(receiptNumber, clientName));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate the receipt PDF.';
    if (/unsupported color function|could not parse a CSS color/i.test(message)) {
      throw new Error(
        'Failed to generate the receipt PDF because html2canvas could not parse a CSS color.',
      );
    }
    throw error instanceof Error ? error : new Error(message);
  }
}

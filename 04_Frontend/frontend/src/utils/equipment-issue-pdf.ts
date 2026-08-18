import { jsPDF } from 'jspdf';
import {
  addPaginatedCanvasToPdf,
  captureHtmlElementForPdf,
  sanitizePdfFilenamePart,
  triggerPdfFileDownload,
} from '@/utils/invoice-pdf';

export function buildEquipmentChecklistPdfFilename(kind: 'issue' | 'return', issueNumber: string): string {
  return `${kind === 'issue' ? 'Equipment-Issue' : 'Equipment-Return'}-${sanitizePdfFilenamePart(issueNumber)}.pdf`;
}

export async function downloadEquipmentChecklistPdf(
  elementId: string,
  kind: 'issue' | 'return',
  issueNumber: string,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Equipment checklist document not found.');
  }

  const canvas = await captureHtmlElementForPdf(element);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addPaginatedCanvasToPdf(pdf, canvas);
  const blob = pdf.output('blob');
  triggerPdfFileDownload(blob, buildEquipmentChecklistPdfFilename(kind, issueNumber));
}

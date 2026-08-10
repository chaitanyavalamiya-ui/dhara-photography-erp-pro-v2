import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 12;

export async function downloadPaymentReceiptPdf(
  elementId: string,
  receiptNumber?: string | null,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Receipt document not found.');
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const contentWidth = A4_WIDTH_MM - PAGE_MARGIN_MM * 2;
  const contentHeight = A4_HEIGHT_MM - PAGE_MARGIN_MM * 2;

  let renderWidth = contentWidth;
  let renderHeight = (canvas.height * renderWidth) / canvas.width;

  if (renderHeight > contentHeight) {
    renderHeight = contentHeight;
    renderWidth = (canvas.width * renderHeight) / canvas.height;
  }

  const offsetX = (A4_WIDTH_MM - renderWidth) / 2;

  pdf.addImage(
    canvas.toDataURL('image/png'),
    'PNG',
    offsetX,
    PAGE_MARGIN_MM,
    renderWidth,
    renderHeight,
  );

  const safeNumber = (receiptNumber ?? 'payment').replace(/[\\/:*?"<>|]/g, '-');
  pdf.save(`Receipt-${safeNumber}.pdf`);
}

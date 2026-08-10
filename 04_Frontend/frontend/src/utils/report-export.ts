import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 12;

export async function downloadReportPdf(
  elementId: string,
  filename: string,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Report document not found.');
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

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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

  const safeName = filename.replace(/[\\/:*?"<>|]/g, '-');
  pdf.save(`${safeName}.pdf`);
}

export function downloadReportExcel(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  sheetName = 'Report',
): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const safeName = filename.replace(/[\\/:*?"<>|]/g, '-');
  XLSX.writeFile(workbook, `${safeName}.xlsx`);
}

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { addPaginatedCanvasToPdf } from '@/utils/invoice-pdf';

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
  addPaginatedCanvasToPdf(pdf, canvas);

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

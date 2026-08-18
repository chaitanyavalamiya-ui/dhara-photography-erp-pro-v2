import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadEquipmentChecklistPdf } from './equipment-issue-pdf';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

vi.mock('jspdf', () => {
  class jsPDF {
    output = vi.fn(() => new Blob(['%PDF-1.4 equipment'], { type: 'application/pdf' }));
    addImage = vi.fn();
    addPage = vi.fn();
  }
  return { jsPDF };
});

vi.mock('./invoice-pdf', async () => {
  const actual = await vi.importActual<typeof import('./invoice-pdf')>('./invoice-pdf');
  return {
    ...actual,
    captureHtmlElementForPdf: vi.fn(async () => ({
      width: 100,
      height: 100,
      toDataURL: () => 'data:image/png;base64,aaa',
    })),
    addPaginatedCanvasToPdf: vi.fn(),
    triggerPdfFileDownload: vi.fn(),
  };
});

describe('downloadEquipmentChecklistPdf', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="equipment-issue-print">checklist</div>';
  });

  it('downloads a PDF blob instead of calling jsPDF.save', async () => {
    const { triggerPdfFileDownload } = await import('./invoice-pdf');
    await downloadEquipmentChecklistPdf('equipment-issue-print', 'issue', 'EI-000001');
    expect(triggerPdfFileDownload).toHaveBeenCalled();
    const blob = vi.mocked(triggerPdfFileDownload).mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
  });
});

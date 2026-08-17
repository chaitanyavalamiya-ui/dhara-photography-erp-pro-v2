import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  containsUnsupportedCssColorFunction,
  getInvoicePdfCaptureTargetSize,
  INVOICE_PDF_A4_WIDTH_PX,
} from './invoice-pdf';
import {
  buildPaymentReceiptPdfFilename,
  createPaymentReceiptPdfCaptureTarget,
  downloadPaymentReceiptPdf,
} from './payment-receipt-pdf';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

vi.mock('jspdf', () => {
  const output = vi.fn();
  const addImage = vi.fn();
  const addPage = vi.fn();
  const jsPDF = vi.fn(function jsPDFMock(this: {
    output: typeof output;
    addImage: typeof addImage;
    addPage: typeof addPage;
  }) {
    this.output = output;
    this.addImage = addImage;
    this.addPage = addPage;
  });
  return { jsPDF };
});

function createCanvas(width = 800, height = 1200): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = {
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(canvas, 'getContext').mockReturnValue(context);
  return canvas;
}

function mockPdfAndDownload() {
  const captured = createCanvas();
  vi.mocked(html2canvas).mockResolvedValue(captured);

  const blob = new Blob(['%PDF-1.4 receipt'], { type: 'application/pdf' });
  const instance = {
    output: vi.fn(() => blob),
    addImage: vi.fn(),
    addPage: vi.fn(),
  };
  vi.mocked(jsPDF).mockImplementation(function jsPDFMock(this: typeof instance) {
    Object.assign(this, instance);
    return this;
  } as never);

  const click = vi.fn();
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    const node = originalCreateElement(tagName);
    if (tagName === 'a') {
      node.click = click;
    }
    if (tagName === 'canvas') {
      vi.spyOn(node as HTMLCanvasElement, 'getContext').mockReturnValue({
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D);
    }
    return node;
  });
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:http://localhost/receipt-pdf'),
    revokeObjectURL: vi.fn(),
  });

  return { click, instance };
}

describe('payment receipt PDF download', () => {
  beforeEach(() => {
    vi.mocked(html2canvas).mockReset();
    vi.mocked(jsPDF).mockClear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('builds a receipt filename from number and client', () => {
    expect(buildPaymentReceiptPdfFilename('RCPT-000010', 'UAT Test Client')).toBe(
      'RCPT-000010-UAT-Test-Client.pdf',
    );
  });

  it('creates a dedicated receipt capture target with non-zero dimensions', async () => {
    const source = document.createElement('div');
    source.id = 'payment-receipt-document';
    source.textContent = 'RCPT-000010 UAT Test Client Amount Received';
    document.body.appendChild(source);

    const session = await createPaymentReceiptPdfCaptureTarget(source);
    try {
      const size = getInvoicePdfCaptureTargetSize(session.captureTarget);
      expect(session.captureTarget).not.toBe(source);
      expect(session.captureTarget.getAttribute('data-invoice-pdf-capture-root')).toBe('true');
      expect(session.captureTarget.textContent).toContain('RCPT-000010');
      expect(size.width).toBeGreaterThanOrEqual(INVOICE_PDF_A4_WIDTH_PX);
      expect(size.height).toBeGreaterThan(0);
      expect(source.id).toBe('payment-receipt-document');
    } finally {
      session.cleanup();
    }
  });

  it('captures the receipt and downloads a PDF blob', async () => {
    const source = document.createElement('div');
    source.id = 'payment-receipt-document';
    source.textContent = 'RCPT-000010 UAT Test Client';
    document.body.appendChild(source);

    const { click, instance } = mockPdfAndDownload();

    await downloadPaymentReceiptPdf('payment-receipt-document', 'RCPT-000010', 'UAT Test Client');

    expect(html2canvas).toHaveBeenCalled();
    expect(instance.output).toHaveBeenCalledWith('blob');
    expect(instance.addImage).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.contexts[0]).toMatchObject({
      download: 'RCPT-000010-UAT-Test-Client.pdf',
    });
    expect((click.mock.contexts[0] as HTMLAnchorElement).target).not.toBe('_blank');
  });

  it('throws when the receipt preview is missing', async () => {
    await expect(
      downloadPaymentReceiptPdf('missing-receipt', 'RCPT-000010', 'Client'),
    ).rejects.toThrow('Receipt document not found.');
  });

  it('passes the dedicated receipt element, not document.body, to html2canvas', async () => {
    const source = document.createElement('div');
    source.id = 'payment-receipt-document';
    source.textContent = 'RCPT-000010 UAT Test Client';
    document.body.appendChild(source);

    mockPdfAndDownload();

    await downloadPaymentReceiptPdf('payment-receipt-document', 'RCPT-000010', 'UAT Test Client');

    const captureArg = vi.mocked(html2canvas).mock.calls[0]?.[0] as HTMLElement;
    expect(captureArg).toBeInstanceOf(HTMLElement);
    expect(captureArg).not.toBe(document.body);
    expect(captureArg).not.toBe(source);
    expect(captureArg.getAttribute('data-invoice-pdf-capture-root')).toBe('true');
    expect(captureArg.textContent).toContain('RCPT-000010');
    expect(getInvoicePdfCaptureTargetSize(captureArg).width).toBeGreaterThan(0);
    expect(getInvoicePdfCaptureTargetSize(captureArg).height).toBeGreaterThan(0);
  });

  it('does not pass unsupported CSS color functions into html2canvas', async () => {
    const source = document.createElement('div');
    source.id = 'payment-receipt-document';
    source.setAttribute('style', 'color: color(srgb 0.42 0.11 0.23); background-color: #ffffff;');
    source.textContent = 'RCPT-000010';
    document.body.appendChild(source);

    const captured = createCanvas();
    vi.mocked(html2canvas).mockImplementation(async (element, options) => {
      const captureRoot = element as HTMLElement;
      expect(captureRoot.getAttribute('data-invoice-pdf-capture-root')).toBe('true');
      expect(containsUnsupportedCssColorFunction(captureRoot.getAttribute('style') ?? '')).toBe(
        false,
      );
      options?.onclone?.(captureRoot.ownerDocument, captureRoot);
      return captured;
    });

    const blob = new Blob(['%PDF-1.4 receipt'], { type: 'application/pdf' });
    vi.mocked(jsPDF).mockImplementation(function jsPDFMock(this: {
      output: () => Blob;
      addImage: ReturnType<typeof vi.fn>;
      addPage: ReturnType<typeof vi.fn>;
    }) {
      this.output = vi.fn(() => blob);
      this.addImage = vi.fn();
      this.addPage = vi.fn();
      return this;
    } as never);

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const node = originalCreateElement(tagName);
      if (tagName === 'a') {
        node.click = vi.fn();
      }
      if (tagName === 'canvas') {
        vi.spyOn(node as HTMLCanvasElement, 'getContext').mockReturnValue({
          drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D);
      }
      return node;
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:http://localhost/receipt-pdf'),
      revokeObjectURL: vi.fn(),
    });

    await downloadPaymentReceiptPdf('payment-receipt-document', 'RCPT-000010', 'UAT Test Client');

    expect(html2canvas).toHaveBeenCalled();
    expect(source.getAttribute('style')).toContain('color(srgb');
  });

  it('does not pass CSS gradients into html2canvas', async () => {
    const source = document.createElement('div');
    source.id = 'payment-receipt-document';
    source.textContent = 'RCPT-000010';
    const bar = document.createElement('div');
    bar.setAttribute(
      'style',
      'background: linear-gradient(90deg, transparent, #b8860b, transparent); height: 1px; width: 160px;',
    );
    source.appendChild(bar);
    document.body.appendChild(source);

    const captured = createCanvas();
    vi.mocked(html2canvas).mockImplementation(async (element, options) => {
      const root = element as HTMLElement;
      expect(root.innerHTML).not.toMatch(/linear-gradient/i);
      options?.onclone?.(root.ownerDocument, root);
      expect(root.innerHTML).not.toMatch(/linear-gradient/i);
      return captured;
    });

    const blob = new Blob(['%PDF-1.4 receipt'], { type: 'application/pdf' });
    vi.mocked(jsPDF).mockImplementation(function jsPDFMock(this: {
      output: () => Blob;
      addImage: ReturnType<typeof vi.fn>;
      addPage: ReturnType<typeof vi.fn>;
    }) {
      this.output = vi.fn(() => blob);
      this.addImage = vi.fn();
      this.addPage = vi.fn();
      return this;
    } as never);

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const node = originalCreateElement(tagName);
      if (tagName === 'a') {
        node.click = vi.fn();
      }
      if (tagName === 'canvas') {
        vi.spyOn(node as HTMLCanvasElement, 'getContext').mockReturnValue({
          drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D);
      }
      return node;
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:http://localhost/receipt-pdf'),
      revokeObjectURL: vi.fn(),
    });

    await downloadPaymentReceiptPdf('payment-receipt-document', 'RCPT-000010', 'UAT Test Client');

    expect(html2canvas).toHaveBeenCalled();
    expect(source.innerHTML).toMatch(/linear-gradient/i);
  });
});

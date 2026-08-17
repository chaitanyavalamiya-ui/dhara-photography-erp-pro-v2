import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  assertInvoicePdfCaptureTarget,
  buildInvoicePdfFilename,
  containsUnsupportedCssColorFunction,
  createInvoicePdfCaptureTarget,
  cssColorToRgb,
  downloadInvoicePdf,
  extractOpaqueCssColor,
  flattenPdfClonePaintSources,
  getInvoicePdfCaptureTargetSize,
  INVOICE_PDF_A4_WIDTH_PX,
  normalizeInvoiceSubtreeForPdfCapture,
  replaceUnsupportedCssColors,
  sanitizeZeroSizeCanvasesForPdfCapture,
  triggerPdfFileDownload,
} from './invoice-pdf';

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

describe('invoice PDF download', () => {
  beforeEach(() => {
    vi.mocked(html2canvas).mockReset();
    vi.mocked(jsPDF).mockClear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('builds a meaningful invoice filename from number and client', () => {
    expect(buildInvoicePdfFilename('INV-000005', 'UAT Test Client')).toBe(
      'INV-000005-UAT-Test-Client.pdf',
    );
  });

  it('triggers a same-origin file download instead of opening a tab', () => {
    const click = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:http://localhost/invoice');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = click;
      }
      return element;
    });

    triggerPdfFileDownload(new Blob(['%PDF'], { type: 'application/pdf' }), 'INV-000005-UAT-Test-Client.pdf');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    const link = document.body.querySelector('a');
    expect(link).toBeNull();
    expect(click.mock.contexts[0]).toMatchObject({
      download: 'INV-000005-UAT-Test-Client.pdf',
      rel: 'noopener',
    });
    expect((click.mock.contexts[0] as HTMLAnchorElement).target).not.toBe('_blank');
  });

  it('captures the preview invoice and downloads a PDF blob', async () => {
    const source = document.createElement('div');
    source.id = 'invoice-document-print';
    source.textContent = 'INV-000005 BK-000008 UAT Test Client';
    document.body.appendChild(source);

    const captured = createCanvas();
    vi.mocked(html2canvas).mockResolvedValue(captured);

    const blob = new Blob(['%PDF-1.4 invoice'], { type: 'application/pdf' });
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
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = click;
      }
      if (tagName === 'canvas') {
        vi.spyOn(element as HTMLCanvasElement, 'getContext').mockReturnValue({
          drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D);
      }
      return element;
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:http://localhost/invoice-pdf'),
      revokeObjectURL: vi.fn(),
    });

    await downloadInvoicePdf('invoice-document-print', 'INV-000005', 'UAT Test Client');

    expect(html2canvas).toHaveBeenCalled();
    expect(instance.output).toHaveBeenCalledWith('blob');
    expect(instance.addImage).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.contexts[0]).toMatchObject({
      download: 'INV-000005-UAT-Test-Client.pdf',
    });
  });

  it('throws a useful error when the invoice preview is missing', async () => {
    await expect(downloadInvoicePdf('missing-invoice', 'INV-000005', 'Client')).rejects.toThrow(
      'Invoice document not found.',
    );
  });

  it('converts unsupported CSS color() functions into rgb values', () => {
    expect(containsUnsupportedCssColorFunction('color(srgb 1 0 0)')).toBe(true);
    expect(containsUnsupportedCssColorFunction('oklch(0.7 0.1 40)')).toBe(true);
    expect(containsUnsupportedCssColorFunction('rgb(26, 26, 26)')).toBe(false);
    expect(cssColorToRgb('color(srgb 1 0 0)')).toBe('rgb(255, 0, 0)');
    expect(replaceUnsupportedCssColors('1px solid color(srgb 0 0 0)')).toBe('1px solid rgb(0, 0, 0)');
    expect(
      replaceUnsupportedCssColors('linear-gradient(color(srgb 1 0 0), color(srgb 0 0 1 / 0.5))'),
    ).toBe('linear-gradient(rgb(255, 0, 0), rgba(0, 0, 255, 0.5))');
  });

  it('normalizes unsupported colors only on the cloned PDF capture tree', () => {
    const source = document.createElement('div');
    source.setAttribute('style', 'color: color(srgb 0.4196 0.1137 0.2275); background: #ffffff;');
    const child = document.createElement('span');
    child.setAttribute('style', 'border-top-color: color(srgb 0 0 0);');
    source.appendChild(child);

    const clone = source.cloneNode(true) as HTMLElement;
    normalizeInvoiceSubtreeForPdfCapture(source, clone);
    normalizeInlineStylesInPlaceForTest(clone);

    expect(source.getAttribute('style')).toContain('color(srgb');
    expect(containsUnsupportedCssColorFunction(clone.getAttribute('style') ?? '')).toBe(false);
    expect(containsUnsupportedCssColorFunction(clone.firstElementChild?.getAttribute('style') ?? '')).toBe(
      false,
    );
  });

  it('does not pass unsupported CSS color functions into html2canvas', async () => {
    const source = document.createElement('div');
    source.id = 'invoice-document-print';
    source.setAttribute('style', 'color: color(srgb 0.42 0.11 0.23); background-color: #ffffff;');
    source.textContent = 'INV-000005';
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

    const blob = new Blob(['%PDF-1.4 invoice'], { type: 'application/pdf' });
    const instance = {
      output: vi.fn(() => blob),
      addImage: vi.fn(),
      addPage: vi.fn(),
    };
    vi.mocked(jsPDF).mockImplementation(function jsPDFMock(this: typeof instance) {
      Object.assign(this, instance);
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
      createObjectURL: vi.fn(() => 'blob:http://localhost/invoice-pdf'),
      revokeObjectURL: vi.fn(),
    });

    await downloadInvoicePdf('invoice-document-print', 'INV-000005', 'UAT Test Client');

    expect(html2canvas).toHaveBeenCalled();
    expect(source.getAttribute('style')).toContain('color(srgb');
  });

  it('removes zero-size canvases from the cloned PDF capture DOM only', () => {
    const live = document.createElement('div');
    const liveCanvas = document.createElement('canvas');
    liveCanvas.width = 0;
    liveCanvas.height = 0;
    liveCanvas.setAttribute('data-live-canvas', 'true');
    live.appendChild(liveCanvas);

    const clone = live.cloneNode(true) as HTMLElement;
    const valid = document.createElement('canvas');
    valid.width = 12;
    valid.height = 8;
    clone.appendChild(valid);

    sanitizeZeroSizeCanvasesForPdfCapture(clone);

    expect(live.querySelector('[data-live-canvas]')).toBeInstanceOf(HTMLCanvasElement);
    expect((live.querySelector('[data-live-canvas]') as HTMLCanvasElement).width).toBe(0);
    expect(clone.querySelectorAll('canvas')).toHaveLength(1);
    expect((clone.querySelector('canvas') as HTMLCanvasElement).width).toBeGreaterThan(0);
    expect((clone.querySelector('canvas') as HTMLCanvasElement).height).toBeGreaterThan(0);
    expect(clone.querySelector('[data-pdf-canvas-placeholder]')).not.toBeNull();
  });

  it('does not pass zero-size canvases into html2canvas', async () => {
    const source = document.createElement('div');
    source.id = 'invoice-document-print';
    source.textContent = 'INV-000005';
    const zero = document.createElement('canvas');
    zero.width = 0;
    zero.height = 0;
    source.appendChild(zero);
    document.body.appendChild(source);

    const captured = createCanvas();
    vi.mocked(html2canvas).mockImplementation(async (element, options) => {
      const root = element as HTMLElement;
      expect(root.getAttribute('data-invoice-pdf-capture-root')).toBe('true');
      const canvases = Array.from(root.querySelectorAll('canvas'));
      expect(canvases.every((canvas) => canvas.width > 0 && canvas.height > 0)).toBe(true);
      const clonedDocument = document.implementation.createHTMLDocument('pdf-capture');
      const clonedElement = root.cloneNode(true) as HTMLElement;
      clonedDocument.body.appendChild(clonedElement);
      options?.onclone?.(clonedDocument, clonedElement);
      const afterClone = Array.from(clonedElement.querySelectorAll('canvas'));
      expect(afterClone.every((canvas) => canvas.width > 0 && canvas.height > 0)).toBe(true);
      return captured;
    });

    const blob = new Blob(['%PDF-1.4 invoice'], { type: 'application/pdf' });
    const instance = {
      output: vi.fn(() => blob),
      addImage: vi.fn(),
      addPage: vi.fn(),
    };
    vi.mocked(jsPDF).mockImplementation(function jsPDFMock(this: typeof instance) {
      Object.assign(this, instance);
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
      createObjectURL: vi.fn(() => 'blob:http://localhost/invoice-pdf'),
      revokeObjectURL: vi.fn(),
    });

    await downloadInvoicePdf('invoice-document-print', 'INV-000005', 'UAT Test Client');

    expect(html2canvas).toHaveBeenCalled();
    expect(source.querySelector('canvas')?.width).toBe(0);
  });

  it('flattens the 1px linear-gradient divider only on the PDF clone', () => {
    expect(extractOpaqueCssColor('linear-gradient(90deg, rgba(0, 0, 0, 0), rgb(184, 134, 11), rgba(0, 0, 0, 0))')).toBe(
      'rgb(184, 134, 11)',
    );

    const live = document.createElement('div');
    const bar = document.createElement('div');
    bar.className = 'mb-3 h-px w-40';
    bar.setAttribute(
      'style',
      'background: linear-gradient(90deg, transparent, #b8860b, transparent); height: 1px; width: 160px;',
    );
    live.appendChild(bar);
    document.body.appendChild(live);

    const clone = live.cloneNode(true) as HTMLElement;
    document.body.appendChild(clone);
    flattenPdfClonePaintSources(clone);

    const clonedBar = clone.firstElementChild as HTMLElement;
    expect(live.firstElementChild?.getAttribute('style') ?? '').toContain('linear-gradient');
    expect(clonedBar.getAttribute('style') ?? '').not.toContain('linear-gradient');
    expect(clonedBar.getAttribute('style') ?? '').toMatch(/#b8860b|rgb\(184,\s*134,\s*11\)/i);
  });

  it('does not pass CSS gradients into html2canvas', async () => {
    const source = document.createElement('div');
    source.id = 'invoice-document-print';
    source.textContent = 'INV-000005';
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

    const blob = new Blob(['%PDF-1.4 invoice'], { type: 'application/pdf' });
    const instance = {
      output: vi.fn(() => blob),
      addImage: vi.fn(),
      addPage: vi.fn(),
    };
    vi.mocked(jsPDF).mockImplementation(function jsPDFMock(this: typeof instance) {
      Object.assign(this, instance);
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
      createObjectURL: vi.fn(() => 'blob:http://localhost/invoice-pdf'),
      revokeObjectURL: vi.fn(),
    });

    await downloadInvoicePdf('invoice-document-print', 'INV-000005', 'UAT Test Client');

    expect(html2canvas).toHaveBeenCalled();
    expect(source.innerHTML).toMatch(/linear-gradient/i);
  });

  it('creates a dedicated invoice capture target with non-zero A4-like dimensions', async () => {
    const source = document.createElement('div');
    source.id = 'invoice-document-print';
    source.textContent = 'INV-000005 BK-000008 UAT Test Client Grand Total';
    document.body.appendChild(source);

    const session = await createInvoicePdfCaptureTarget(source);
    try {
      const target = assertInvoicePdfCaptureTarget(session.captureTarget, 'INV-000005');
      const size = getInvoicePdfCaptureTargetSize(target);

      expect(target).not.toBe(source);
      expect(target.getAttribute('data-invoice-pdf-capture-root')).toBe('true');
      expect(target.textContent).toContain('INV-000005');
      expect(target.textContent).toContain('UAT Test Client');
      expect(size.width).toBeGreaterThanOrEqual(INVOICE_PDF_A4_WIDTH_PX);
      expect(size.height).toBeGreaterThan(0);
      expect(source.id).toBe('invoice-document-print');
    } finally {
      session.cleanup();
    }
  });

  it('passes the dedicated invoice element, not the document body, to html2canvas', async () => {
    const source = document.createElement('div');
    source.id = 'invoice-document-print';
    source.textContent = 'INV-000005 BK-000008 UAT Test Client';
    document.body.appendChild(source);

    const captured = createCanvas();
    vi.mocked(html2canvas).mockResolvedValue(captured);

    const blob = new Blob(['%PDF-1.4 invoice'], { type: 'application/pdf' });
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
      createObjectURL: vi.fn(() => 'blob:http://localhost/invoice-pdf'),
      revokeObjectURL: vi.fn(),
    });

    await downloadInvoicePdf('invoice-document-print', 'INV-000005', 'UAT Test Client');

    const captureArg = vi.mocked(html2canvas).mock.calls[0]?.[0] as HTMLElement;
    expect(captureArg).toBeInstanceOf(HTMLElement);
    expect(captureArg).not.toBe(document.body);
    expect(captureArg).not.toBe(source);
    expect(captureArg.getAttribute('data-invoice-pdf-capture-root')).toBe('true');
    expect(captureArg.textContent).toContain('INV-000005');
    expect(getInvoicePdfCaptureTargetSize(captureArg).width).toBeGreaterThan(0);
    expect(getInvoicePdfCaptureTargetSize(captureArg).height).toBeGreaterThan(0);
  });
});

function normalizeInlineStylesInPlaceForTest(root: HTMLElement): void {
  const elements = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const element of elements) {
    if (!(element instanceof HTMLElement) || !element.getAttribute('style')) {
      continue;
    }
    element.setAttribute('style', replaceUnsupportedCssColors(element.getAttribute('style') ?? ''));
  }
}

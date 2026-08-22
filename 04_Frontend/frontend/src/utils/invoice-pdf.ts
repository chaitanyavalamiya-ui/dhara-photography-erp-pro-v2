import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 12;

const UNSUPPORTED_COLOR_FUNCTION_PATTERN =
  /(?<![\w-])(?:color-mix|light-dark|oklch|oklab|lch|hwb|lab|color)\(/i;

const COLOR_PROPERTIES = new Set([
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'text-emphasis-color',
  'column-rule-color',
  'caret-color',
  'fill',
  'stroke',
  'stop-color',
  'flood-color',
  'lighting-color',
  '-webkit-text-fill-color',
  '-webkit-text-stroke-color',
]);

const COMPLEX_COLOR_PROPERTIES = new Set([
  'background',
  'background-image',
  'border',
  'border-image',
  'border-image-source',
  'box-shadow',
  'text-shadow',
  'filter',
  'outline',
  'outline-style',
]);

export function containsUnsupportedCssColorFunction(value: string): boolean {
  return UNSUPPORTED_COLOR_FUNCTION_PATTERN.test(value);
}

function findMatchingParen(value: string, openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < value.length; index += 1) {
    const character = value[index];
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function findUnsupportedColorFunction(
  value: string,
): { start: number; end: number; text: string } | null {
  const matcher = /(?<![\w-])(?:color-mix|light-dark|oklch|oklab|lch|hwb|lab|color)\(/gi;
  const match = matcher.exec(value);
  if (!match) {
    return null;
  }

  const openIndex = match.index + match[0].length - 1;
  const closeIndex = findMatchingParen(value, openIndex);
  if (closeIndex < 0) {
    return null;
  }

  return {
    start: match.index,
    end: closeIndex + 1,
    text: value.slice(match.index, closeIndex + 1),
  };
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseSrgbColorFunction(value: string): string | null {
  const match = value
    .trim()
    .match(
      /^color\(\s*srgb\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)(?:\s*\/\s*(-?[\d.]+%?))?\s*\)$/i,
    );
  if (!match) {
    return null;
  }

  const red = clampByte(Number(match[1]) * 255);
  const green = clampByte(Number(match[2]) * 255);
  const blue = clampByte(Number(match[3]) * 255);
  if (match[4] == null) {
    return `rgb(${red}, ${green}, ${blue})`;
  }

  const alphaToken = match[4];
  const alpha = alphaToken.endsWith('%')
    ? Number(alphaToken.slice(0, -1)) / 100
    : Number(alphaToken);
  return `rgba(${red}, ${green}, ${blue}, ${Number.isFinite(alpha) ? alpha : 1})`;
}

function canvasColorToRgb(value: string): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return null;
    }

    context.clearRect(0, 0, 1, 1);
    context.fillStyle = '#000000';
    context.fillStyle = value;
    const applied = context.fillStyle;
    if (typeof applied === 'string' && !containsUnsupportedCssColorFunction(applied)) {
      return applied;
    }

    context.fillRect(0, 0, 1, 1);
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
    if (alpha === 255) {
      return `rgb(${red}, ${green}, ${blue})`;
    }
    return `rgba(${red}, ${green}, ${blue}, ${Math.round((alpha / 255) * 1000) / 1000})`;
  } catch {
    return null;
  }
}

export function cssColorToRgb(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'none' || trimmed === 'transparent' || trimmed === 'currentcolor') {
    return trimmed || 'rgba(0, 0, 0, 0)';
  }

  if (!containsUnsupportedCssColorFunction(trimmed)) {
    return trimmed;
  }

  return parseSrgbColorFunction(trimmed) ?? canvasColorToRgb(trimmed) ?? 'rgb(0, 0, 0)';
}

export function replaceUnsupportedCssColors(value: string): string {
  let current = value;
  let guard = 0;

  while (containsUnsupportedCssColorFunction(current) && guard < 80) {
    guard += 1;
    const match = findUnsupportedColorFunction(current);
    if (!match) {
      break;
    }
    current = `${current.slice(0, match.start)}${cssColorToRgb(match.text)}${current.slice(match.end)}`;
  }

  return current;
}

function isStandaloneColorProperty(property: string): boolean {
  return COLOR_PROPERTIES.has(property) || property.endsWith('-color');
}

function normalizeCssColorValue(property: string, value: string): string {
  if (!value) {
    return value;
  }

  if (
    COMPLEX_COLOR_PROPERTIES.has(property) ||
    property.includes('shadow') ||
    property.includes('image') ||
    containsUnsupportedCssColorFunction(value)
  ) {
    return replaceUnsupportedCssColors(value);
  }

  if (isStandaloneColorProperty(property)) {
    return cssColorToRgb(value);
  }

  return value;
}

function asHtmlElement(node: Node | null | undefined): HTMLElement | null {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }
  return node as HTMLElement;
}

function copyNormalizedComputedStyles(source: Element, target: Element): void {
  const sourceElement = asHtmlElement(source);
  const targetElement = asHtmlElement(target);
  if (!sourceElement || !targetElement) {
    return;
  }

  const computed = getComputedStyle(source);
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed[index];
    const normalized = normalizeCssColorValue(property, computed.getPropertyValue(property));
    targetElement.style.setProperty(property, normalized, 'important');
  }
}

export function normalizeInvoiceSubtreeForPdfCapture(sourceRoot: Element, cloneRoot: Element): void {
  copyNormalizedComputedStyles(sourceRoot, cloneRoot);

  const sourceChildren = Array.from(sourceRoot.children);
  const cloneChildren = Array.from(cloneRoot.children);
  const count = Math.min(sourceChildren.length, cloneChildren.length);
  for (let index = 0; index < count; index += 1) {
    normalizeInvoiceSubtreeForPdfCapture(sourceChildren[index], cloneChildren[index]);
  }
}

function normalizeInlineStylesInPlace(root: Element): void {
  const elements = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const element of elements) {
    if (!asHtmlElement(element) || !element.getAttribute('style')) {
      continue;
    }
    const nextStyle = replaceUnsupportedCssColors(element.getAttribute('style') ?? '');
    element.setAttribute('style', nextStyle);
  }
}

function isZeroSizeCanvas(canvas: HTMLCanvasElement): boolean {
  return canvas.width < 1 || canvas.height < 1;
}

function replaceCanvasWithPlaceholder(canvas: HTMLCanvasElement): void {
  const placeholder = document.createElement('span');
  placeholder.setAttribute('data-pdf-canvas-placeholder', 'true');
  placeholder.style.cssText = canvas.getAttribute('style') ?? '';
  placeholder.style.display = canvas.style.display || 'inline-block';
  placeholder.style.overflow = 'hidden';
  placeholder.style.pointerEvents = 'none';
  placeholder.style.visibility = 'hidden';
  const cssWidth = canvas.style.width;
  const cssHeight = canvas.style.height;
  if (cssWidth) {
    placeholder.style.width = cssWidth;
  }
  if (cssHeight) {
    placeholder.style.height = cssHeight;
  }
  canvas.replaceWith(placeholder);
}

function preserveMeaningfulCanvas(canvas: HTMLCanvasElement): void {
  if (canvas.width < 1) {
    canvas.width = Math.max(1, Math.round(canvas.offsetWidth) || 1);
  }
  if (canvas.height < 1) {
    canvas.height = Math.max(1, Math.round(canvas.offsetHeight) || 1);
  }
}

function sanitizeCanvasBackgrounds(root: ParentNode): void {
  const elements =
    root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : Array.from(root.querySelectorAll('*'));

  for (const element of elements) {
    const htmlElement = asHtmlElement(element);
    if (!htmlElement) {
      continue;
    }

    const backgroundImage = htmlElement.style.backgroundImage;
    const background = htmlElement.style.background;
    if (/canvas/i.test(backgroundImage) || /canvas/i.test(background)) {
      htmlElement.style.setProperty('background-image', 'none', 'important');
    }
  }
}

export function sanitizeZeroSizeCanvasesForPdfCapture(root: ParentNode): void {
  const canvases = Array.from(root.querySelectorAll('canvas'));
  for (const canvas of canvases) {
    if (isZeroSizeCanvas(canvas)) {
      replaceCanvasWithPlaceholder(canvas);
      continue;
    }
    preserveMeaningfulCanvas(canvas);
  }
  sanitizeCanvasBackgrounds(root);
}

function ignoreUnsafePdfCaptureElement(element: Element): boolean {
  if (element.tagName.toLowerCase() !== 'canvas') {
    return false;
  }
  return isZeroSizeCanvas(element as HTMLCanvasElement);
}

export const INVOICE_PDF_A4_WIDTH_PX = 794;
export const INVOICE_PDF_A4_MIN_HEIGHT_PX = 1123;

export function getInvoicePdfCaptureTargetSize(element: HTMLElement): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  const styleWidth = Number.parseFloat(element.style.width) || 0;
  const styleHeight =
    Number.parseFloat(element.style.minHeight) || Number.parseFloat(element.style.height) || 0;

  return {
    width: Math.max(
      Math.round(rect.width),
      element.scrollWidth,
      element.offsetWidth,
      styleWidth,
      INVOICE_PDF_A4_WIDTH_PX,
    ),
    height: Math.max(
      Math.round(rect.height),
      element.scrollHeight,
      element.offsetHeight,
      styleHeight,
      1,
    ),
  };
}

/** Isolates PDF capture from ERP dark-theme inheritance. Hex only — html2canvas-safe. */
export const INVOICE_PDF_SAFE_CSS = `
.dhara-inv-paper,
.dhara-inv-paper * {
  color-scheme: light !important;
  mix-blend-mode: normal !important;
  filter: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  background-clip: border-box !important;
  -webkit-background-clip: border-box !important;
  text-shadow: none !important;
  box-shadow: none !important;
  opacity: 1 !important;
  transform: none !important;
  isolation: auto !important;
}
.dhara-inv-paper {
  overflow: visible !important;
  background: #fbf6ee !important;
  background-image: none !important;
  color: #2c211c !important;
  -webkit-text-fill-color: #2c211c !important;
}
.dhara-inv-paper-frame,
.dhara-inv-paper-inner {
  background: #fffcf7 !important;
  background-image: none !important;
}
.dhara-inv-paper-dhara,
.dhara-inv-paper-title {
  overflow: visible !important;
  padding-left: 2px !important;
  color: #6b1d3a !important;
  -webkit-text-fill-color: #6b1d3a !important;
}
.dhara-inv-paper-photography,
.dhara-inv-paper-contact,
.dhara-inv-paper-detail,
.dhara-inv-paper-client,
.dhara-inv-paper-event-name,
.dhara-inv-paper-notes,
.dhara-inv-paper-list li,
.dhara-inv-paper-kv dd,
.dhara-inv-paper-date,
.dhara-inv-paper-date b,
.dhara-inv-paper-pay-item dd,
.dhara-inv-paper-total-row,
.dhara-inv-paper-total-row span:last-child,
.dhara-inv-paper-terms li,
.dhara-inv-paper-sign-line p {
  letter-spacing: normal !important;
  word-spacing: normal !important;
  color: #2c211c !important;
  -webkit-text-fill-color: #2c211c !important;
}
.dhara-inv-paper-label,
.dhara-inv-paper-tax,
.dhara-inv-paper-number,
.dhara-inv-paper-kv dt,
.dhara-inv-paper-pay-item dt {
  color: #6b1d3a !important;
  -webkit-text-fill-color: #6b1d3a !important;
}
.dhara-inv-paper-kv dt,
.dhara-inv-paper-pay-item dt,
.dhara-inv-paper-patan {
  color: #8a6a2f !important;
  -webkit-text-fill-color: #8a6a2f !important;
}
.dhara-inv-paper-goldline,
.dhara-inv-paper-footer-rule {
  height: 3px !important;
  max-height: 3px !important;
  background: #c4a35a !important;
  background-image: none !important;
}
.dhara-inv-paper-table {
  border-collapse: separate !important;
  border-spacing: 0 !important;
  background: #fffcf7 !important;
}
.dhara-inv-paper-table th {
  background: #6b1d3a !important;
  background-image: none !important;
  color: #faf4e8 !important;
  -webkit-text-fill-color: #faf4e8 !important;
}
.dhara-inv-paper-table td {
  background: #fffcf7 !important;
  background-image: none !important;
  color: #2c211c !important;
  -webkit-text-fill-color: #2c211c !important;
}
.dhara-inv-paper-table tbody tr:nth-child(even) td {
  background: #f7f0e4 !important;
}
.dhara-inv-paper-table .is-idx,
.dhara-inv-paper-table td.is-amt {
  color: #6b1d3a !important;
  -webkit-text-fill-color: #6b1d3a !important;
}
.dhara-inv-paper-table th.is-amt,
.dhara-inv-paper-table th.is-num {
  color: #faf4e8 !important;
  -webkit-text-fill-color: #faf4e8 !important;
}
.dhara-inv-paper-total-row.is-grand,
.dhara-inv-paper-total-row.is-grand span:last-child {
  color: #6b1d3a !important;
  -webkit-text-fill-color: #6b1d3a !important;
  background: #f4ead9 !important;
}
.dhara-inv-paper-total-row.is-balance,
.dhara-inv-paper-total-row.is-balance span:last-child {
  color: #faf4e8 !important;
  -webkit-text-fill-color: #faf4e8 !important;
  background: #6b1d3a !important;
}
.dhara-inv-paper-status.is-partially_paid {
  color: #5c4518 !important;
  -webkit-text-fill-color: #5c4518 !important;
  background: #f1e2c0 !important;
}
.dhara-inv-paper-tagline {
  color: #6b1d3a !important;
  -webkit-text-fill-color: #6b1d3a !important;
}
`;

export function applyInvoicePdfSafePaint(root: HTMLElement): void {
  const documentRef = root.ownerDocument;
  let styleEl = root.querySelector('style[data-invoice-pdf-safe]');
  if (!styleEl) {
    styleEl = documentRef.createElement('style');
    styleEl.setAttribute('data-invoice-pdf-safe', 'true');
    styleEl.textContent = INVOICE_PDF_SAFE_CSS;
    root.insertBefore(styleEl, root.firstChild);
  }

  const nodes = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const node of nodes) {
    const element = asHtmlElement(node);
    if (!element || element.tagName === 'STYLE') {
      continue;
    }
    element.style.setProperty('mix-blend-mode', 'normal', 'important');
    element.style.setProperty('filter', 'none', 'important');
    element.style.setProperty('backdrop-filter', 'none', 'important');
    element.style.setProperty('opacity', '1', 'important');
    element.style.setProperty('transform', 'none', 'important');
    element.style.setProperty('background-clip', 'border-box', 'important');
    element.style.setProperty('-webkit-background-clip', 'border-box', 'important');
  }
}

export function applyInvoicePdfCaptureDimensions(
  element: HTMLElement,
  width = INVOICE_PDF_A4_WIDTH_PX,
  height = INVOICE_PDF_A4_MIN_HEIGHT_PX,
): void {
  element.style.setProperty('width', `${width}px`, 'important');
  element.style.setProperty('min-width', `${width}px`, 'important');
  element.style.setProperty('max-width', `${width}px`, 'important');
  element.style.setProperty('min-height', `${height}px`, 'important');
  element.style.setProperty('margin', '0', 'important');
  element.style.setProperty('box-shadow', 'none', 'important');
  element.style.setProperty('position', 'static', 'important');
  element.style.setProperty('transform', 'none', 'important');
  element.style.setProperty('overflow', 'visible', 'important');
}

export function assertInvoicePdfCaptureTarget(
  element: HTMLElement | null,
  expectedContent?: string,
): HTMLElement {
  if (!element) {
    throw new Error('PDF capture target was not created.');
  }

  const { width, height } = getInvoicePdfCaptureTargetSize(element);
  if (width < 1 || height < 1) {
    throw new Error('PDF capture target was empty.');
  }

  if (expectedContent && !element.textContent?.includes(expectedContent)) {
    throw new Error('PDF capture target is missing document content.');
  }

  return element;
}

async function waitForCaptureReady(element: HTMLElement): Promise<void> {
  const fontSet = element.ownerDocument.fonts;
  if (fontSet?.ready) {
    await Promise.race([
      fontSet.ready.catch(() => undefined),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 1500);
      }),
    ]);
  }

  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (image) =>
        image.complete ||
        new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function createCaptureFrame(): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('data-invoice-pdf-frame', 'true');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${INVOICE_PDF_A4_WIDTH_PX}px;height:${INVOICE_PDF_A4_MIN_HEIGHT_PX}px;border:0;opacity:0;pointer-events:none;`;
  return iframe;
}

function populateCaptureFrame(iframe: HTMLIFrameElement): Document | null {
  const frameDocument = iframe.contentDocument;
  if (!frameDocument) {
    return null;
  }

  frameDocument.open();
  frameDocument.write(
    '<!DOCTYPE html><html><head></head><body style="margin:0;background:#ffffff;color-scheme:light;"></body></html>',
  );
  frameDocument.close();
  return frameDocument.body ? frameDocument : null;
}

export async function createInvoicePdfCaptureTarget(source: HTMLElement): Promise<{
  captureTarget: HTMLElement;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  const liveSize = getInvoicePdfCaptureTargetSize(source);
  const width = liveSize.width;
  const height = Math.max(liveSize.height, INVOICE_PDF_A4_MIN_HEIGHT_PX);

  const iframe = createCaptureFrame();
  iframe.style.width = `${width}px`;
  iframe.style.height = `${height}px`;
  document.body.appendChild(iframe);

  const frameDocument = populateCaptureFrame(iframe);
  const hostFallback = document.createElement('div');
  hostFallback.setAttribute('data-invoice-pdf-capture', 'true');
  hostFallback.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;min-height:${height}px;background:#fbf6ee;z-index:-1;pointer-events:none;`;

  const parent = frameDocument?.body ?? hostFallback;
  if (parent === hostFallback) {
    document.body.appendChild(hostFallback);
  }

  const captureTarget = source.cloneNode(true) as HTMLElement;
  captureTarget.setAttribute('data-invoice-pdf-capture-root', 'true');
  captureTarget.removeAttribute('id');
  parent.appendChild(captureTarget);

  // Do not copy live computed styles from the ERP preview — inherited cream text and
  // dark-theme paint make html2canvas render an incomplete invoice.
  normalizeInlineStylesInPlace(captureTarget);
  applyInvoicePdfSafePaint(captureTarget);
  flattenPdfClonePaintSources(captureTarget);
  sanitizeZeroSizeCanvasesForPdfCapture(captureTarget);
  applyInvoicePdfCaptureDimensions(captureTarget, width, height);
  assertInvoicePdfCaptureTarget(captureTarget, source.textContent?.trim().slice(0, 32) || undefined);

  return {
    captureTarget,
    width,
    height,
    cleanup: () => {
      iframe.remove();
      hostFallback.remove();
    },
  };
}

export function addPaginatedCanvasToPdf(pdf: jsPDF, canvas: HTMLCanvasElement): void {
  if (!canvas.width || !canvas.height) {
    throw new Error('PDF capture was empty.');
  }

  const contentWidth = A4_WIDTH_MM - PAGE_MARGIN_MM * 2;
  const contentHeight = A4_HEIGHT_MM - PAGE_MARGIN_MM * 2;
  const pageHeightPx = Math.max(1, Math.floor((canvas.width * contentHeight) / contentWidth));
  // Ignore a thin leftover strip (capture min-height / rounding) that would print as a blank page.
  const minTrailingSlicePx = Math.max(16, Math.round(pageHeightPx * 0.04));

  if (canvas.height <= pageHeightPx + minTrailingSlicePx) {
    const ratio = canvas.height / canvas.width;
    let imageWidth = contentWidth;
    let imageHeight = imageWidth * ratio;
    if (imageHeight > contentHeight) {
      imageHeight = contentHeight;
      imageWidth = imageHeight / ratio;
    }
    pdf.addImage(canvas, 'PNG', PAGE_MARGIN_MM, PAGE_MARGIN_MM, imageWidth, imageHeight);
    return;
  }

  let offsetY = 0;
  let isFirstPage = true;

  while (offsetY < canvas.height) {
    const remaining = canvas.height - offsetY;
    if (!isFirstPage && remaining < minTrailingSlicePx) {
      break;
    }

    const sliceHeight = Math.min(pageHeightPx, remaining);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;
    const context = pageCanvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to prepare the invoice PDF page.');
    }
    context.drawImage(
      canvas,
      0,
      offsetY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );

    const sliceHeightMm = (sliceHeight * contentWidth) / canvas.width;
    if (!isFirstPage) {
      pdf.addPage();
    }
    isFirstPage = false;
    pdf.addImage(pageCanvas, 'PNG', PAGE_MARGIN_MM, PAGE_MARGIN_MM, contentWidth, sliceHeightMm);
    offsetY += sliceHeight;
  }
}

export function sanitizePdfFilenamePart(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return sanitized || 'invoice';
}

export function buildInvoicePdfFilename(
  invoiceNumber?: string | null,
  clientName?: string | null,
): string {
  const parts = [invoiceNumber, clientName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .map(sanitizePdfFilenamePart);

  return `${parts.join('-') || 'invoice'}.pdf`;
}

export function triggerPdfFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

const CSS_GRADIENT_PATTERN = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/i;

export function extractOpaqueCssColor(value: string): string | null {
  const matches = value.match(/rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-f]{3,8}/gi) ?? [];
  for (const token of matches) {
    if (/^rgba?\(\s*\d+(?:\s*,\s*\d+){2}\s*,\s*0(?:\.0+)?\s*\)$/i.test(token)) {
      continue;
    }
    if (/^hsla?\([^)]+,\s*0(?:\.0+)?\s*\)$/i.test(token)) {
      continue;
    }
    return token;
  }
  return null;
}

function guardHtml2CanvasCreatePattern(view: Window | null): () => void {
  const proto = (view as Window & typeof globalThis | null)?.CanvasRenderingContext2D?.prototype;
  if (!proto) {
    return () => undefined;
  }

  const original = proto.createPattern;
  proto.createPattern = function guardedCreatePattern(
    image: CanvasImageSource,
    repetition: string | null,
  ) {
    const width = 'width' in image ? Number(image.width) : 0;
    const height = 'height' in image ? Number(image.height) : 0;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
      return null;
    }
    return original.call(this, image, repetition);
  };

  return () => {
    proto.createPattern = original;
  };
}

export function flattenPdfClonePaintSources(root: HTMLElement): void {
  const nodes = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const node of nodes) {
    const element = asHtmlElement(node);
    if (!element) {
      continue;
    }

    const computed = getComputedStyle(element);
    const backgroundImage = element.style.backgroundImage || computed.backgroundImage;
    const background = element.style.background || '';
    const styleAttr = element.getAttribute('style') ?? '';
    if (
      !CSS_GRADIENT_PATTERN.test(backgroundImage) &&
      !CSS_GRADIENT_PATTERN.test(background) &&
      !CSS_GRADIENT_PATTERN.test(styleAttr)
    ) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    const className = element.className?.toString() ?? '';
    const color =
      (/\bdhara-inv-paper-goldline\b|\bdhara-inv-paper-footer-rule\b/.test(className)
        ? '#c4a35a'
        : null) ??
      (/\bdhara-inv-paper\b/.test(className) && !/\bdhara-inv-paper-/.test(className)
        ? '#fbf6ee'
        : null) ??
      extractOpaqueCssColor(backgroundImage) ??
      extractOpaqueCssColor(background) ??
      extractOpaqueCssColor(styleAttr) ??
      (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)'
        ? computed.backgroundColor
        : 'rgb(184, 134, 11)');

    element.style.setProperty('background-image', 'none', 'important');
    element.style.setProperty('background', color, 'important');
    element.style.setProperty('background-color', color, 'important');
    element.style.backgroundImage = 'none';
    element.style.background = color;
    element.style.backgroundColor = color;
    if (styleAttr) {
      const nextStyle = styleAttr
        .replace(/background(?:-image)?:[^;]+;?/gi, '')
        .trim();
      element.setAttribute(
        'style',
        `${nextStyle ? `${nextStyle}; ` : ''}background: ${color}; background-image: none; background-color: ${color};`,
      );
    }

    const isPaperRule =
      /\bdhara-inv-paper-goldline\b|\bdhara-inv-paper-footer-rule\b/.test(className);
    if (isPaperRule) {
      element.style.setProperty('height', '3px', 'important');
      element.style.setProperty('min-height', '3px', 'important');
      element.style.setProperty('width', '100%', 'important');
      continue;
    }

    // Only pin 1px hairlines that already have a laid-out size. Off-screen clones
    // often report 0x0 and must not be collapsed into a 2px square.
    if (rect.height > 0 && rect.height < 2) {
      const height = Math.max(2, Math.round(rect.height) || element.offsetHeight || 2);
      element.style.setProperty('height', `${height}px`, 'important');
      element.style.setProperty('min-height', `${height}px`, 'important');
    }
    if (rect.width > 0 && rect.width < 2) {
      const width = Math.max(2, Math.round(rect.width) || element.offsetWidth || 2);
      element.style.setProperty('width', `${width}px`, 'important');
      element.style.setProperty('min-width', `${width}px`, 'important');
    }
  }
}

export async function captureHtmlElementForPdf(element: HTMLElement): Promise<HTMLCanvasElement> {
  const session = await createInvoicePdfCaptureTarget(element);
  const { captureTarget, width, height, cleanup } = session;
  let restoreCreatePattern: (() => void) | undefined;

  try {
    await waitForCaptureReady(captureTarget);
    assertInvoicePdfCaptureTarget(captureTarget);

    const canvas = await html2canvas(captureTarget, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#fbf6ee',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      ignoreElements: ignoreUnsafePdfCaptureElement,
      onclone: (clonedDocument, clonedElement) => {
        const clonedRoot = asHtmlElement(clonedElement);
        if (!clonedRoot) {
          throw new Error('PDF capture target was not created.');
        }
        restoreCreatePattern = guardHtml2CanvasCreatePattern(clonedDocument.defaultView);
        normalizeInlineStylesInPlace(clonedRoot);
        applyInvoicePdfSafePaint(clonedRoot);
        flattenPdfClonePaintSources(clonedRoot);
        sanitizeZeroSizeCanvasesForPdfCapture(clonedRoot);
        applyInvoicePdfCaptureDimensions(clonedRoot, width, height);
        assertInvoicePdfCaptureTarget(clonedRoot);
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('PDF capture target was empty.');
    }

    return canvas;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown PDF capture error.';
    if (/unsupported color function/i.test(message)) {
      throw new Error(
        'Failed to generate the PDF because html2canvas could not parse a CSS color.',
      );
    }
    throw error instanceof Error ? error : new Error(message);
  } finally {
    restoreCreatePattern?.();
    cleanup();
  }
}

export async function downloadInvoicePdf(
  elementId: string,
  invoiceNumber?: string | null,
  clientName?: string | null,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Invoice document not found.');
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
    triggerPdfFileDownload(blob, buildInvoicePdfFilename(invoiceNumber, clientName));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate the invoice PDF.';
    if (/unsupported color function|could not parse a CSS color/i.test(message)) {
      throw new Error(
        'Failed to generate the invoice PDF because html2canvas could not parse a CSS color.',
      );
    }
    throw error instanceof Error ? error : new Error(message);
  }
}

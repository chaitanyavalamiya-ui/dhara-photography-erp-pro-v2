import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/** Canonical invoice paper = one A4 sheet. Do not add extra PDF page margins. */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
/**
 * jsPDF can emit a blank second page when an image is even 0.1mm past 297mm.
 * Keep a hair of inset so one visual A4 sheet stays one PDF page.
 */
export const INVOICE_PDF_A4_FIT_HEIGHT_MM = 296.5;
/**
 * Normal Dhara invoices are one A4 sheet. Scale the whole capture onto that sheet
 * unless the bitmap is clearly longer than two full pages of content.
 */
export const INVOICE_PDF_SINGLE_PAGE_OVERFLOW_RATIO = 1;

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

export function getInvoicePdfPageHeightPx(canvasWidth: number): number {
  return Math.max(1, Math.round((canvasWidth * A4_HEIGHT_MM) / A4_WIDTH_MM));
}

export function shouldFitInvoicePdfOnSingleA4Page(canvasWidth: number, canvasHeight: number): boolean {
  return canvasWidth >= 1 && canvasHeight >= 1;
}

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
  display: flex !important;
  flex-direction: column !important;
  overflow: visible !important;
  background: #fbf6ee !important;
  background-image: none !important;
  color: #2c211c !important;
  -webkit-text-fill-color: #2c211c !important;
}
.dhara-inv-paper-frame,
.dhara-inv-paper-inner {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 1 auto !important;
  width: 100% !important;
  background: #fffcf7 !important;
  background-image: none !important;
}
.dhara-inv-paper-inner > * {
  flex-shrink: 0 !important;
}
.dhara-inv-paper-bottom {
  margin-top: auto !important;
}
.dhara-inv-paper-title {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  gap: 6px !important;
  line-height: 1.15 !important;
  overflow: visible !important;
  padding-left: 2px !important;
  color: #6b1d3a !important;
  -webkit-text-fill-color: #6b1d3a !important;
}
.dhara-inv-paper-dhara {
  display: block !important;
  line-height: 1.15 !important;
  overflow: visible !important;
  padding-left: 2px !important;
  color: #6b1d3a !important;
  -webkit-text-fill-color: #6b1d3a !important;
}
.dhara-inv-paper-photography {
  display: block !important;
  margin-top: 0 !important;
  line-height: 1.35 !important;
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
  element.style.setProperty('display', 'flex', 'important');
  element.style.setProperty('flex-direction', 'column', 'important');
  element.style.setProperty('width', `${width}px`, 'important');
  element.style.setProperty('min-width', `${width}px`, 'important');
  element.style.setProperty('max-width', `${width}px`, 'important');
  element.style.setProperty('height', `${height}px`, 'important');
  element.style.setProperty('min-height', `${height}px`, 'important');
  element.style.setProperty('margin', '0', 'important');
  element.style.setProperty('box-shadow', 'none', 'important');
  element.style.setProperty('position', 'static', 'important');
  element.style.setProperty('transform', 'none', 'important');
  element.style.setProperty('overflow', 'visible', 'important');

  const frame = element.querySelector('.dhara-inv-paper-frame');
  const inner = element.querySelector('.dhara-inv-paper-inner');
  for (const node of [frame, inner]) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }
    node.style.setProperty('display', 'flex', 'important');
    node.style.setProperty('flex-direction', 'column', 'important');
    node.style.setProperty('flex', '1 1 auto', 'important');
    node.style.setProperty('width', '100%', 'important');
    node.style.setProperty('height', '100%', 'important');
  }

  const bottom = element.querySelector('.dhara-inv-paper-bottom');
  if (bottom instanceof HTMLElement) {
    bottom.style.setProperty('margin-top', 'auto', 'important');
  }
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
  applyMeasuredSize: () => { width: number; height: number };
  cleanup: () => void;
}> {
  const width = INVOICE_PDF_A4_WIDTH_PX;
  const liveSize = getInvoicePdfCaptureTargetSize(source);
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

  const applyMeasuredSize = () => {
    const measured = getInvoicePdfCaptureTargetSize(captureTarget);
    const nextWidth = INVOICE_PDF_A4_WIDTH_PX;
    const nextHeight = Math.max(measured.height, INVOICE_PDF_A4_MIN_HEIGHT_PX);
    iframe.style.width = `${nextWidth}px`;
    iframe.style.height = `${nextHeight}px`;
    hostFallback.style.width = `${nextWidth}px`;
    hostFallback.style.minHeight = `${nextHeight}px`;
    applyInvoicePdfCaptureDimensions(captureTarget, nextWidth, nextHeight);
    return { width: nextWidth, height: nextHeight };
  };

  return {
    captureTarget,
    width,
    height,
    applyMeasuredSize,
    cleanup: () => {
      iframe.remove();
      hostFallback.remove();
    },
  };
}

const INVOICE_PDF_KEEP_TOGETHER_SELECTOR = [
  '.dhara-inv-paper-header',
  '.dhara-inv-paper-parties',
  '.dhara-inv-paper-summary',
  '.dhara-inv-paper-pay',
  '.dhara-inv-paper-box',
  '.dhara-inv-paper-bottom',
  '.dhara-inv-paper-footer',
  '.dhara-inv-paper-table thead',
  '.dhara-inv-paper-table tbody tr',
].join(',');

export function collectInvoicePdfKeepTogetherRanges(root: HTMLElement): { start: number; end: number }[] {
  const rootRect = root.getBoundingClientRect();
  return Array.from(root.querySelectorAll(INVOICE_PDF_KEEP_TOGETHER_SELECTOR))
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        start: rect.top - rootRect.top,
        end: rect.bottom - rootRect.top,
      };
    })
    .filter((range) => range.end - range.start > 2)
    .sort((left, right) => left.start - right.start);
}

export function scaleInvoicePdfKeepTogetherRanges(
  ranges: { start: number; end: number }[],
  scale: number,
): { start: number; end: number }[] {
  return ranges.map((range) => ({
    start: Math.round(range.start * scale),
    end: Math.round(range.end * scale),
  }));
}

export function chooseInvoicePdfSliceHeight(
  offsetY: number,
  maxSliceHeight: number,
  canvasHeight: number,
  keepTogetherRanges: { start: number; end: number }[] = [],
): number {
  const remaining = canvasHeight - offsetY;
  const preferred = Math.min(maxSliceHeight, remaining);
  if (preferred <= 1 || preferred === remaining) {
    return preferred;
  }

  const preferredEnd = offsetY + preferred;
  const minBreak = offsetY + Math.round(maxSliceHeight * 0.28);
  const hit = keepTogetherRanges.find(
    (range) => range.start < preferredEnd && range.end > preferredEnd + 1,
  );

  if (hit && hit.start > offsetY && hit.start >= minBreak) {
    return Math.max(1, hit.start - offsetY);
  }

  return preferred;
}

function readInvoicePdfKeepTogetherRanges(
  canvas: HTMLCanvasElement,
): { start: number; end: number }[] {
  const raw = canvas.dataset.invoicePdfKeepTogether;
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as { start: number; end: number }[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isInvoicePdfPaperPixel(red: number, green: number, blue: number, alpha: number): boolean {
  if (alpha < 16) {
    return true;
  }
  return red > 220 && green > 208 && blue > 175 && Math.abs(red - green) < 45;
}

function invoicePdfBandHasContent(
  context: CanvasRenderingContext2D,
  width: number,
  y: number,
  bandHeight: number,
  canvasHeight: number,
): boolean {
  const top = Math.max(0, Math.min(y, canvasHeight - 1));
  const height = Math.max(1, Math.min(bandHeight, canvasHeight - top));
  const pixels = context.getImageData(0, top, width, height).data;
  const sampleStep = 16;
  let ink = 0;
  let samples = 0;
  for (let index = 0; index < pixels.length; index += sampleStep) {
    samples += 1;
    if (
      !isInvoicePdfPaperPixel(
        pixels[index] ?? 0,
        pixels[index + 1] ?? 0,
        pixels[index + 2] ?? 0,
        pixels[index + 3] ?? 255,
      )
    ) {
      ink += 1;
    }
  }
  return samples > 0 && ink / samples > 0.02;
}

export function findQuietInvoicePdfSliceHeight(
  canvas: HTMLCanvasElement,
  offsetY: number,
  maxSliceHeight: number,
): number {
  const remaining = canvas.height - offsetY;
  const preferred = Math.min(maxSliceHeight, remaining);
  if (preferred <= 1 || preferred === remaining) {
    return preferred;
  }

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context?.getImageData) {
    return preferred;
  }

  const minSliceHeight = Math.max(1, Math.round(maxSliceHeight * 0.58));
  // Must be taller than the label/value gap inside Payment Information.
  const bandHeight = 48;
  try {
    for (let sliceHeight = preferred; sliceHeight >= minSliceHeight; sliceHeight -= 2) {
      const y = offsetY + sliceHeight - bandHeight;
      if (y < offsetY) {
        break;
      }
      if (!invoicePdfBandHasContent(context, canvas.width, y, bandHeight, canvas.height)) {
        return sliceHeight;
      }
    }
  } catch {
    return preferred;
  }

  return preferred;
}

function padInvoiceCanvasToA4(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const pageHeightPx = getInvoicePdfPageHeightPx(canvas.width);
  if (canvas.height + 1 >= pageHeightPx) {
    return canvas;
  }

  try {
    const padded = document.createElement('canvas');
    padded.width = canvas.width;
    padded.height = pageHeightPx;
    const context = padded.getContext('2d');
    if (!context) {
      return canvas;
    }
    context.fillStyle = '#fbf6ee';
    context.fillRect(0, 0, padded.width, padded.height);
    context.drawImage(canvas, 0, 0);
    return padded;
  } catch {
    return canvas;
  }
}

function addSingleA4CanvasToPdf(pdf: jsPDF, canvas: HTMLCanvasElement): void {
  const source = padInvoiceCanvasToA4(canvas);
  const pageHeightPx = getInvoicePdfPageHeightPx(source.width);
  if (source.height <= pageHeightPx + 32) {
    pdf.addImage(
      source,
      'PNG',
      0,
      0,
      A4_WIDTH_MM,
      INVOICE_PDF_A4_FIT_HEIGHT_MM,
      undefined,
      'FAST',
    );
    return;
  }

  const ratio = source.height / source.width;
  let imageWidth = A4_WIDTH_MM;
  let imageHeight = imageWidth * ratio;
  if (imageHeight > INVOICE_PDF_A4_FIT_HEIGHT_MM) {
    imageHeight = INVOICE_PDF_A4_FIT_HEIGHT_MM;
    imageWidth = imageHeight / ratio;
  }
  const x = Math.max(0, (A4_WIDTH_MM - imageWidth) / 2);
  pdf.addImage(source, 'PNG', x, 0, imageWidth, imageHeight, undefined, 'FAST');
}

export function addPaginatedCanvasToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  keepTogetherRanges: { start: number; end: number }[] = [],
): void {
  if (!canvas.width || !canvas.height) {
    throw new Error('PDF capture was empty.');
  }

  const ranges = keepTogetherRanges.length > 0 ? keepTogetherRanges : readInvoicePdfKeepTogetherRanges(canvas);
  const pageHeightPx = getInvoicePdfPageHeightPx(canvas.width);
  const minTrailingSlicePx = Math.max(16, Math.round(pageHeightPx * 0.04));

  if (shouldFitInvoicePdfOnSingleA4Page(canvas.width, canvas.height)) {
    addSingleA4CanvasToPdf(pdf, canvas);
    return;
  }

  let offsetY = 0;
  let isFirstPage = true;

  while (offsetY < canvas.height) {
    const remaining = canvas.height - offsetY;
    if (!isFirstPage && remaining < minTrailingSlicePx) {
      break;
    }

    const maxSliceHeight = Math.min(pageHeightPx, remaining);
    const sectionSliceHeight = chooseInvoicePdfSliceHeight(
      offsetY,
      maxSliceHeight,
      canvas.height,
      ranges,
    );
    const sliceHeight =
      sectionSliceHeight < maxSliceHeight
        ? sectionSliceHeight
        : findQuietInvoicePdfSliceHeight(canvas, offsetY, maxSliceHeight);
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

    const sliceHeightMm = (sliceHeight * A4_WIDTH_MM) / canvas.width;
    if (!isFirstPage) {
      pdf.addPage();
    }
    isFirstPage = false;
    pdf.addImage(pageCanvas, 'PNG', 0, 0, A4_WIDTH_MM, sliceHeightMm);
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
  const { captureTarget, cleanup } = session;
  let restoreCreatePattern: (() => void) | undefined;

  try {
    await waitForCaptureReady(captureTarget);
    const { width, height } = session.applyMeasuredSize();
    assertInvoicePdfCaptureTarget(captureTarget);
    const keepTogetherCss = collectInvoicePdfKeepTogetherRanges(captureTarget);
    const layoutWidth = Math.max(1, captureTarget.offsetWidth || width);

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

    canvas.dataset.invoicePdfKeepTogether = JSON.stringify(
      scaleInvoicePdfKeepTogetherRanges(keepTogetherCss, canvas.width / layoutWidth),
    );
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

export async function generateInvoicePdfBlob(
  elementId: string,
  invoiceNumber?: string | null,
  clientName?: string | null,
): Promise<{ blob: Blob; filename: string }> {
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
      compress: true,
    });

    addPaginatedCanvasToPdf(pdf, canvas);

    return {
      blob: pdf.output('blob'),
      filename: buildInvoicePdfFilename(invoiceNumber, clientName),
    };
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

export async function downloadInvoicePdf(
  elementId: string,
  invoiceNumber?: string | null,
  clientName?: string | null,
): Promise<void> {
  const { blob, filename } = await generateInvoicePdfBlob(elementId, invoiceNumber, clientName);
  triggerPdfFileDownload(blob, filename);
}

const CHECKLIST_PRINT_STYLE = `
  html, body {
    margin: 0;
    padding: 0;
    background: #fff !important;
    color: #1a1a1a !important;
  }
  @page { size: A4 portrait; margin: 12mm; }
  @media print {
    html, body {
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function collectDocumentStyles(): string {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n');
}

function printChecklistInPlace(element: HTMLElement): void {
  const style = document.createElement('style');
  style.setAttribute('data-equipment-checklist-print', 'true');
  style.textContent = `
    @page { size: A4 portrait; margin: 12mm; }
    @media print {
      html, body { background: #fff !important; }
      body * { visibility: hidden !important; }
      #${element.id}, #${element.id} * { visibility: visible !important; }
      #${element.id} {
        position: absolute !important;
        inset: 0 auto auto 0 !important;
        width: 180mm !important;
        max-width: 180mm !important;
        margin: 0 !important;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
  document.head.appendChild(style);
  window.print();
  style.remove();
}

function triggerPrintWindow(printWindow: Window): void {
  const run = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const waitForStylesheets = () => {
    const links = Array.from(printWindow.document.querySelectorAll('link[rel="stylesheet"]'));
    if (links.length === 0) {
      run();
      return;
    }

    void Promise.all(
      links.map(
        (link) =>
          new Promise<void>((resolve) => {
            const stylesheet = link as HTMLLinkElement;
            if (stylesheet.sheet) {
              resolve();
              return;
            }
            stylesheet.addEventListener('load', () => resolve(), { once: true });
            stylesheet.addEventListener('error', () => resolve(), { once: true });
          }),
      ),
    ).then(run);
  };

  if (printWindow.document.readyState === 'complete') {
    waitForStylesheets();
    return;
  }

  printWindow.addEventListener('load', waitForStylesheets, { once: true });
}

export function printEquipmentChecklist(elementId: string, title: string): void {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!printWindow) {
    printChecklistInPlace(element);
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        ${collectDocumentStyles()}
        <style data-equipment-checklist-print="true">${CHECKLIST_PRINT_STYLE}</style>
      </head>
      <body>${element.outerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  triggerPrintWindow(printWindow);
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { printEquipmentChecklist } from './equipment-print';

describe('printEquipmentChecklist', () => {
  let written = '';
  const print = vi.fn();
  const close = vi.fn();
  const focus = vi.fn();
  const addEventListener = vi.fn();

  beforeEach(() => {
    written = '';
    print.mockReset();
    close.mockReset();
    focus.mockReset();
    addEventListener.mockReset();

    document.head.innerHTML =
      '<style>.text-xl{font-size:1.25rem}</style><link rel="stylesheet" href="/app.css" />';
    document.body.innerHTML = `
      <div id="equipment-checklist-document" class="mx-auto w-full max-w-[180mm] bg-white p-8">
        <h1 class="text-xl font-bold text-[#6b1d3a]">Dhara Photography Patan</h1>
        <p class="text-sm text-[#b8860b]">Equipment Issue Checklist</p>
      </div>
    `;

    vi.spyOn(window, 'open').mockImplementation(
      () =>
        ({
          document: {
            readyState: 'complete',
            open: vi.fn(),
            write: (html: string) => {
              written += html;
            },
            close: vi.fn(),
            querySelectorAll: () => [],
          },
          focus,
          print,
          close,
          addEventListener,
        }) as unknown as Window,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('prints the styled checklist node with app stylesheets, not a raw innerHTML reset', () => {
    printEquipmentChecklist('equipment-checklist-document', 'Equipment Issue Checklist');

    expect(written).toContain('id="equipment-checklist-document"');
    expect(written).toContain('max-w-[180mm]');
    expect(written).toContain('Dhara Photography Patan');
    expect(written).toContain('.text-xl{font-size:1.25rem}');
    expect(written).toContain('href="/app.css"');
    expect(written).toContain('@page { size: A4 portrait; margin: 12mm; }');
    expect(written).not.toContain('* { box-sizing: border-box; margin: 0; padding: 0; }');
    expect(print).toHaveBeenCalled();
  });

  it('falls back to in-page print CSS when the print window is blocked', () => {
    vi.mocked(window.open).mockReturnValue(null);
    const pagePrint = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    printEquipmentChecklist('equipment-checklist-document', 'Equipment Issue Checklist');

    expect(pagePrint).toHaveBeenCalled();
    expect(document.querySelector('[data-equipment-checklist-print]')).toBeNull();
  });
});

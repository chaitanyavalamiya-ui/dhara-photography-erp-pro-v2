import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DHARA_THEMES, type DharaThemeDefinition } from '@/theme/dhara-themes';
import { useDharaTheme } from '@/theme/ThemeProvider';
import { cn } from '@/utils/cn';

function Swatches({ colors, size = 'md' }: { colors: DharaThemeDefinition['swatches']; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-md border',
        size === 'sm' ? 'h-5 w-11' : 'h-6 w-14',
      )}
      style={{ borderColor: 'var(--dhara-border)' }}
      aria-hidden
    >
      {colors.map((color) => (
        <span key={color} className="flex-1" style={{ background: color }} />
      ))}
    </span>
  );
}

export function ThemeSelector() {
  const { theme, setTheme } = useDharaTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = DHARA_THEMES.find((item) => item.id === theme) ?? DHARA_THEMES[0];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative max-w-xl">
      <p className="mb-2 text-sm" style={{ color: 'var(--dhara-text-secondary)' }}>
        Theme
      </p>
      <button
        id="dhara-theme-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="dhara-theme-listbox"
        aria-label={current.name}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition duration-200"
        style={{
          background: 'var(--dhara-glass-bg)',
          border: '1px solid var(--dhara-border)',
          color: 'var(--dhara-text-primary)',
          boxShadow: open ? '0 0 0 3px var(--dhara-glow)' : 'var(--dhara-glass-shadow)',
          backdropFilter: 'blur(var(--dhara-glass-blur))',
        }}
        onClick={() => setOpen((value) => !value)}
      >
        <Swatches colors={current.swatches} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-semibold">{current.name}</span>
          {current.approved && (
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--dhara-accent)' }}>
              Approved
            </span>
          )}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition duration-200', open && 'rotate-180')}
          style={{ color: 'var(--dhara-accent)' }}
        />
      </button>

      {open && (
        <ul
          id="dhara-theme-listbox"
          role="listbox"
          aria-label="Dhara Photography themes"
          className="dhara-modal-enter absolute z-40 mt-2 max-h-80 w-full overflow-auto rounded-xl p-1.5"
          style={{
            background: 'var(--dhara-glass-bg)',
            border: '1px solid var(--dhara-border)',
            boxShadow: 'var(--dhara-glass-shadow)',
            backdropFilter: 'blur(var(--dhara-glass-blur))',
          }}
        >
          {DHARA_THEMES.map((item) => {
            const selected = item.id === theme;
            return (
              <li key={item.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition duration-200"
                  style={{
                    background: selected
                      ? 'color-mix(in srgb, var(--dhara-accent) 14%, transparent)'
                      : 'transparent',
                    color: 'var(--dhara-text-primary)',
                    boxShadow: selected ? 'inset 2px 0 0 var(--dhara-accent)' : undefined,
                  }}
                  onClick={() => {
                    setTheme(item.id);
                  }}
                >
                  <Swatches colors={item.swatches} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--dhara-accent)' }} aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

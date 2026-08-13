import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeSelector } from './ThemeSelector';
import { DharaThemeProvider } from '@/theme/ThemeProvider';
import { DHARA_THEMES } from '@/theme/dhara-themes';

describe('ThemeSelector', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('data-dhara-theme', 'royal-cinematic');
  });

  it('opens a dropdown of all ten themes and applies a selection immediately', () => {
    render(
      <DharaThemeProvider>
        <ThemeSelector />
      </DharaThemeProvider>,
    );

    const trigger = screen.getByRole('button', { name: /Dhara Royal Cinematic/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    for (const theme of DHARA_THEMES) {
      expect(screen.getByRole('option', { name: new RegExp(theme.name) })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole('option', { name: /Emerald Royal/ }));
    expect(document.documentElement.getAttribute('data-dhara-theme')).toBe('emerald-royal');
    expect(document.body.getAttribute('data-dhara-theme')).toBe('emerald-royal');
    expect(localStorage.getItem('dhara-theme')).toBe('emerald-royal');
    expect(screen.getByRole('button', { name: /Emerald Royal/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: /Emerald Royal/ })).toHaveAttribute('aria-selected', 'true');
  });
});

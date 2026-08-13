import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UiPrototypePage } from './UiPrototypePage';
import { DharaThemeProvider } from '@/theme/ThemeProvider';

describe('UiPrototypePage', () => {
  it('renders the themed prototype shell and theme selector', () => {
    render(
      <DharaThemeProvider>
        <UiPrototypePage />
      </DharaThemeProvider>,
    );
    expect(screen.getByText(/10 Dhara themes/)).toBeInTheDocument();
    expect(screen.getByText('ધારા ફોટોગ્રાફી · પાટણ · લગ્ન ફોટોગ્રાફી')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New enquiry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Robo AI Assistant/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dhara Royal Cinematic/ })).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryErrorPanel, isEnabledQueryLoading } from './QueryErrorPanel';

describe('QueryErrorPanel', () => {
  it('renders the error message and Retry action', () => {
    const onRetry = vi.fn();
    render(<QueryErrorPanel error={new Error('API down')} fallback="Failed." onRetry={onRetry} />);

    expect(screen.getByText('API down')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('isEnabledQueryLoading', () => {
  it('is true only when the query is enabled and loading', () => {
    expect(isEnabledQueryLoading(true, { isLoading: true })).toBe(true);
    expect(isEnabledQueryLoading(true, { isLoading: false })).toBe(false);
    expect(isEnabledQueryLoading(false, { isLoading: true })).toBe(false);
  });
});

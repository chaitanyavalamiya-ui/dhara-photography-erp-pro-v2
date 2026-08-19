import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

let shouldThrow = true;

function Boom() {
  if (shouldThrow) {
    throw new Error('render boom');
  }
  return <div>workspace recovered</div>;
}

describe('AppErrorBoundary', () => {
  it('shows a fallback instead of a blank screen and retries', () => {
    shouldThrow = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByText('workspace recovered')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});

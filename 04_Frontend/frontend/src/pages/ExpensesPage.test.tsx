import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpensesPage } from './ExpensesPage';
import { expensesService } from '@/services/expenses-service';
import { settingsService } from '@/services/settings-service';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('@/services/expenses-service', async () => {
  const actual = await vi.importActual<typeof import('@/services/expenses-service')>(
    '@/services/expenses-service',
  );
  return {
    ...actual,
    expensesService: {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
    },
  };
});

vi.mock('@/services/settings-service', () => ({
  settingsService: {
    getMasterData: vi.fn(),
  },
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ExpensesPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const emptyPage = {
  items: [],
  total: 0,
  totalAmount: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
};

describe('ExpensesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'admin@example.com',
        companyId: 'c1',
        permissions: ['expenses.read', 'expenses.create', 'expenses.update'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
    vi.mocked(settingsService.getMasterData).mockResolvedValue([]);
    vi.mocked(expensesService.list).mockResolvedValue(emptyPage);
  });

  it('shows a first-time empty state', async () => {
    renderPage();
    expect(await screen.findByText('No expenses yet.')).toBeInTheDocument();
  });

  it('shows a search empty state', async () => {
    renderPage();
    fireEvent.change(
      screen.getByPlaceholderText('Search vendor, description, booking, or reference'),
      { target: { value: 'nope' } },
    );
    fireEvent.submit(
      screen
        .getByPlaceholderText('Search vendor, description, booking, or reference')
        .closest('form')!,
    );
    expect(await screen.findByText('No expenses match your search.')).toBeInTheDocument();
  });

  it('hides Edit when the user lacks expenses.update', async () => {
    vi.mocked(expensesService.list).mockResolvedValue({
      ...emptyPage,
      items: [
        {
          id: 'e1',
          categoryCode: 'fuel',
          categoryLabel: 'Fuel',
          amount: 500,
          expenseDate: '2026-08-16',
          description: 'Site travel',
          vendorPerson: 'Ravi',
          paymentModeCode: 'cash',
          paymentModeLabel: 'Cash',
          referenceNumber: 'BILL-1',
          notes: null,
          createdAt: '2026-08-16T00:00:00.000Z',
        },
      ],
      total: 1,
      totalAmount: 500,
    });

    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Viewer',
        email: 'v@example.com',
        companyId: 'c1',
        permissions: ['expenses.read'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });

    renderPage();
    expect(await screen.findByText('Ravi')).toBeInTheDocument();
    expect(screen.queryByLabelText('Edit expense')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Archive expense')).not.toBeInTheDocument();
  });

  it('blocks inverted date ranges without calling the API', async () => {
    renderPage();
    expect(await screen.findByText('No expenses yet.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-16' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-08-01' } });

    expect(
      await screen.findByText('Start date must be on or before end date.'),
    ).toBeInTheDocument();
    expect(expensesService.list).not.toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: '2026-08-16', dateTo: '2026-08-01' }),
    );
  });
});

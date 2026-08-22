import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingStaffPaymentsSection } from './BookingStaffPaymentsSection';
import { bookingOperationsService } from '@/services/booking-operations-service';
import { staffService } from '@/services/staff-service';
import { useAuthStore } from '@/stores/auth-store';
import type { Booking } from '@/services/bookings-service';

vi.mock('@/services/booking-operations-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/booking-operations-service')>();
  return {
    ...actual,
    bookingOperationsService: {
      ...actual.bookingOperationsService,
      listStaffPayments: vi.fn(),
      createStaffPayment: vi.fn(),
    },
  };
});

vi.mock('@/services/staff-service', () => ({
  staffService: {
    listBookingTeam: vi.fn(),
  },
}));

const booking: Booking = {
  id: 'booking-1',
  bookingNumber: 'BK-000001',
  clientId: 'client-1',
  client: { id: 'client-1', fullName: 'Rahul Patel', mobile: '9876543210' },
  eventType: 'Wedding',
  eventDate: '2026-12-15',
  items: [],
  servicesSummary: '',
  subtotal: 10000,
  discount: 0,
  totalAmount: 10000,
  advanceAmount: 0,
  balanceAmount: 10000,
  status: 'Confirmed',
  statusCode: 'confirmed',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const teamMember = {
  id: 'asg-1',
  staffId: 'staff-1',
  staffName: 'Kiran',
  role: 'photographer',
  roleLabel: 'Photographer',
  agreedRate: 5000,
};

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(['reports', 'overview'], { total: 1 });
  queryClient.setQueryData(['accounts', 'dashboard'], { total: 1 });
  queryClient.setQueryData(['expenses'], { items: [] });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

  render(
    <QueryClientProvider client={queryClient}>
      <BookingStaffPaymentsSection booking={booking} />
    </QueryClientProvider>,
  );

  return { queryClient, invalidateSpy };
}

describe('BookingStaffPaymentsSection financial cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'admin@local',
        companyId: 'c1',
        permissions: ['bookings.update', 'bookings.read'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
    vi.mocked(staffService.listBookingTeam).mockResolvedValue([teamMember] as never);
    vi.mocked(bookingOperationsService.listStaffPayments).mockResolvedValue([]);
  });

  it('invalidates expenses, accounts, and reports after a paid staff payment', async () => {
    vi.mocked(bookingOperationsService.createStaffPayment).mockResolvedValue({
      id: 'pay-1',
      bookingStaffId: 'asg-1',
      staffName: 'Kiran',
      staffCode: 'ST-1',
      role: 'photographer',
      roleLabel: 'Photographer',
      amount: 1500,
      status: 'paid',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const { queryClient, invalidateSpy } = renderSection();
    const statusSelects = await screen.findAllByRole('combobox');
    fireEvent.change(statusSelects[0], { target: { value: 'asg-1' } });
    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '1500' } });
    fireEvent.change(statusSelects[1], { target: { value: 'paid' } });
    fireEvent.click(screen.getByRole('button', { name: /Record Payment/i }));

    await waitFor(() => {
      expect(bookingOperationsService.createStaffPayment).toHaveBeenCalled();
    });
    expect(queryClient.getQueryState(['reports', 'overview'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['accounts', 'dashboard'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['expenses'])?.isInvalidated).toBe(true);
    expect(
      invalidateSpy.mock.calls.some(
        (call) => JSON.stringify(call[0]) === JSON.stringify({ queryKey: ['bookings', 'booking-1', 'staff-payments'] }),
      ),
    ).toBe(true);
  });

  it('does not invalidate financial totals after a pending staff payment', async () => {
    vi.mocked(bookingOperationsService.createStaffPayment).mockResolvedValue({
      id: 'pay-2',
      bookingStaffId: 'asg-1',
      staffName: 'Kiran',
      staffCode: 'ST-1',
      role: 'photographer',
      roleLabel: 'Photographer',
      amount: 1500,
      status: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const { queryClient } = renderSection();
    const statusSelects = await screen.findAllByRole('combobox');
    fireEvent.change(statusSelects[0], { target: { value: 'asg-1' } });
    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '1500' } });
    fireEvent.change(statusSelects[1], { target: { value: 'pending' } });
    fireEvent.click(screen.getByRole('button', { name: /Record Payment/i }));

    await waitFor(() => {
      expect(bookingOperationsService.createStaffPayment).toHaveBeenCalled();
    });
    expect(queryClient.getQueryState(['reports', 'overview'])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(['accounts', 'dashboard'])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(['expenses'])?.isInvalidated).toBe(false);
  });

  it('does not invalidate financial totals when create fails', async () => {
    vi.mocked(bookingOperationsService.createStaffPayment).mockRejectedValue(new Error('Failed'));
    const { queryClient } = renderSection();
    const statusSelects = await screen.findAllByRole('combobox');
    fireEvent.change(statusSelects[0], { target: { value: 'asg-1' } });
    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: /Record Payment/i }));

    await waitFor(() => {
      expect(bookingOperationsService.createStaffPayment).toHaveBeenCalled();
    });
    expect(queryClient.getQueryState(['reports', 'overview'])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(['accounts', 'dashboard'])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(['expenses'])?.isInvalidated).toBe(false);
  });
});

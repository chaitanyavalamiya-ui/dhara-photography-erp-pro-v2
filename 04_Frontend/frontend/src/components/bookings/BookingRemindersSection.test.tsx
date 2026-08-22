import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingRemindersSection } from './BookingRemindersSection';
import { bookingOperationsService } from '@/services/booking-operations-service';
import { useAuthStore } from '@/stores/auth-store';
import type { Booking } from '@/services/bookings-service';

vi.mock('@/services/booking-operations-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/booking-operations-service')>();
  return {
    ...actual,
    bookingOperationsService: {
      ...actual.bookingOperationsService,
      listReminders: vi.fn(),
      createReminder: vi.fn(),
      updateReminder: vi.fn(),
      deleteReminder: vi.fn(),
    },
  };
});

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
  advanceAmount: 4000,
  balanceAmount: 6000,
  paymentStatus: 'Partial',
  status: 'Confirmed',
  statusCode: 'confirmed',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const reminder = {
  id: 'rem-1',
  bookingId: 'booking-1',
  reminderType: 'other',
  reminderDate: '2026-09-01',
  note: 'Call client',
  status: 'active',
};

function setPermissions(permissions: string[]) {
  useAuthStore.setState({
    user: {
      id: 'u1',
      fullName: 'Staff',
      email: 'staff@local',
      companyId: 'c1',
      permissions,
    },
    accessToken: 'token',
    refreshToken: 'refresh',
    isAuthenticated: true,
  });
}

function renderSection() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <BookingRemindersSection booking={booking} />
    </QueryClientProvider>,
  );
}

describe('BookingRemindersSection delete', () => {
  beforeEach(() => {
    vi.mocked(bookingOperationsService.listReminders).mockResolvedValue([reminder]);
    vi.mocked(bookingOperationsService.deleteReminder).mockReset();
    vi.mocked(bookingOperationsService.deleteReminder).mockResolvedValue(undefined);
  });

  it('hides Remove when the user lacks bookings.update', async () => {
    setPermissions(['bookings.read']);
    renderSection();
    expect(await screen.findByText('Call client', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('shows Remove when the user has bookings.update', async () => {
    setPermissions(['bookings.read', 'bookings.update']);
    renderSection();
    expect(await screen.findByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('opens delete confirmation without calling the API', async () => {
    setPermissions(['bookings.read', 'bookings.update']);
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(await screen.findByRole('heading', { name: 'Remove Reminder' })).toBeInTheDocument();
    expect(bookingOperationsService.deleteReminder).not.toHaveBeenCalled();
  });

  it('calls DELETE with the reminder id on confirm and refreshes the list', async () => {
    setPermissions(['bookings.read', 'bookings.update']);
    vi.mocked(bookingOperationsService.listReminders)
      .mockResolvedValueOnce([reminder])
      .mockResolvedValueOnce([]);
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Reminder' }));
    await waitFor(() => {
      expect(bookingOperationsService.deleteReminder).toHaveBeenCalledWith('booking-1', 'rem-1');
    });
    await waitFor(() => {
      expect(screen.queryByText('Call client', { exact: false })).not.toBeInTheDocument();
    });
  });

  it('keeps the reminder and shows an error when DELETE fails', async () => {
    setPermissions(['bookings.read', 'bookings.update']);
    vi.mocked(bookingOperationsService.deleteReminder).mockRejectedValue(new Error('Reminder not found.'));
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Reminder' }));
    expect(await screen.findByText('Reminder not found.')).toBeInTheDocument();
    expect(screen.getByText('Call client', { exact: false })).toBeInTheDocument();
    expect(bookingOperationsService.deleteReminder).toHaveBeenCalledTimes(1);
  });

  it('does not call DELETE when confirmation is cancelled', async () => {
    setPermissions(['bookings.read', 'bookings.update']);
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(bookingOperationsService.deleteReminder).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Remove Reminder' })).not.toBeInTheDocument();
    expect(screen.getByText('Call client', { exact: false })).toBeInTheDocument();
  });
});

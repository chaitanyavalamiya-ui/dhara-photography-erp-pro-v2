import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { BookingFormModal } from './BookingFormModal';
import type { Booking } from '@/services/bookings-service';
import { clientsService } from '@/services/clients-service';
import { settingsService } from '@/services/settings-service';

vi.mock('@/services/clients-service', () => ({
  clientsService: {
    list: vi.fn(),
  },
}));

vi.mock('@/services/settings-service', () => ({
  settingsService: {
    getPackages: vi.fn(),
  },
}));

const booking: Booking = {
  id: 'booking-1',
  bookingNumber: 'BK-000001',
  clientId: 'client-current',
  client: { id: 'client-current', fullName: 'Rahul Patel', mobile: '9999999999' },
  eventType: 'Wedding',
  eventDate: '2026-12-15',
  eventEndDate: '2026-12-16',
  items: [
    {
      serviceName: 'Photography',
      quantity: 1,
      unit: 'day',
      rate: 5000,
      days: 1,
      amount: 5000,
    },
  ],
  servicesSummary: 'Photography',
  subtotal: 5000,
  discount: 0,
  totalAmount: 5000,
  advanceAmount: 0,
  balanceAmount: 5000,
  status: 'Enquiry',
  statusCode: 'enquiry',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  vi.mocked(clientsService.list).mockResolvedValue({
    items: [
      {
        id: 'other-1',
        clientNumber: 'CLT-000001',
        fullName: 'Other Client',
        mobile: '9000000000',
        status: 'Active',
        isActive: true,
        totalBookings: 0,
        totalAmount: 0,
        outstandingBalance: 0,
        createdAt: '',
        updatedAt: '',
      },
    ],
    total: 1,
    page: 1,
    limit: 100,
    totalPages: 1,
  } as never);
  vi.mocked(settingsService.getPackages).mockResolvedValue([]);

  const onSubmit = vi.fn();

  render(
    <QueryClientProvider client={client}>
      <BookingFormModal
        open
        mode="edit"
        booking={booking}
        serviceRates={[]}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />
    </QueryClientProvider>,
  );

  return { onSubmit };
}

describe('BookingFormModal', () => {
  it('keeps the current booking client available even when it is outside the first 100 results', async () => {
    renderForm();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Rahul Patel/ })).toBeInTheDocument();
    });
    expect(screen.getByRole('combobox', { name: /Client/ })).toHaveValue('client-current');
  });

  it('blocks saving when the end date is before the start date', async () => {
    const { onSubmit } = renderForm();
    await waitFor(() => {
      expect(screen.getByDisplayValue('2026-12-15')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Event End Date/), {
      target: { value: '2026-12-10' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Event end date cannot be before the start date.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingViewModal } from './BookingViewModal';
import { useAuthStore } from '@/stores/auth-store';
import { bookingsService } from '@/services/bookings-service';
import type { Booking } from '@/services/bookings-service';

vi.mock('@/services/bookings-service', () => ({
  bookingsService: {
    getById: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/services/invoices-service', () => ({
  invoicesService: { list: vi.fn().mockResolvedValue({ items: [] }) },
}));

vi.mock('@/services/galleries-service', () => ({
  galleriesService: { list: vi.fn().mockResolvedValue({ items: [] }) },
}));

vi.mock('@/services/albums-service', () => ({
  albumsService: { list: vi.fn().mockResolvedValue({ items: [] }) },
}));

vi.mock('@/services/deliveries-service', () => ({
  deliveriesService: { list: vi.fn().mockResolvedValue({ items: [] }) },
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
  advanceAmount: 4000,
  balanceAmount: 6000,
  paymentStatus: 'Partial',
  status: 'Confirmed',
  statusCode: 'confirmed',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderModal(canEdit: boolean) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BookingViewModal
          open
          booking={booking}
          canEdit={canEdit}
          onClose={() => undefined}
          onEdit={() => undefined}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BookingViewModal permissions', () => {
  beforeEach(() => {
    vi.mocked(bookingsService.getById).mockResolvedValue(booking);
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Staff',
        email: 'staff@local',
        companyId: 'c1',
        permissions: ['bookings.read'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
  });

  it('hides Edit when the user lacks bookings.update', () => {
    renderModal(false);
    expect(screen.queryByRole('button', { name: 'Edit Booking' })).not.toBeInTheDocument();
  });

  it('shows Edit when the user has bookings.update', () => {
    renderModal(true);
    expect(screen.getByRole('button', { name: 'Edit Booking' })).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddStaffPaymentModal } from './AddStaffPaymentModal';
import { bookingsService } from '@/services/bookings-service';
import { staffService } from '@/services/staff-service';

vi.mock('@/services/staff-service', () => ({
  staffService: {
    list: vi.fn(),
  },
}));

vi.mock('@/services/bookings-service', () => ({
  bookingsService: {
    list: vi.fn(),
  },
}));

function renderModal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AddStaffPaymentModal open onClose={() => undefined} onSubmit={() => undefined} />
    </QueryClientProvider>,
  );
}

describe('AddStaffPaymentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(staffService.list).mockResolvedValue({
      items: [
        {
          id: 'staff-1',
          staffCode: 'STF-0001',
          fullName: 'Ravi Photographer',
          role: 'photographer',
          roleLabel: 'Photographer',
          paymentType: 'per_event',
          paymentTypeLabel: 'Per Event',
          defaultRate: 5000,
          isActive: true,
          totalAssignments: 2,
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
    vi.mocked(bookingsService.list).mockResolvedValue({
      items: [
        {
          id: 'booking-1',
          bookingNumber: 'BK-000008',
          clientId: 'client-1',
          client: { id: 'client-1', fullName: 'UAT Test Client', mobile: '9876543211' },
          eventType: 'Wedding',
          status: 'confirmed',
          items: [],
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    } as never);
  });

  it('renders required staff payment fields', async () => {
    renderModal();

    expect(await screen.findByRole('heading', { name: 'Add Staff Payment' })).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument();
    expect(screen.getByText('Booking (optional)')).toBeInTheDocument();
    expect(screen.getByText('Amount (₹)')).toBeInTheDocument();
    expect(screen.getByText('Payment Date')).toBeInTheDocument();
    expect(screen.getByText('Payment Method')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /Ravi Photographer/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /BK-000008/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cash' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'UPI' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bank Transfer' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
  });
});

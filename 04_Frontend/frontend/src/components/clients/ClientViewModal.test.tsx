import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ClientViewModal } from './ClientViewModal';
import { bookingsService } from '@/services/bookings-service';
import { invoicesService } from '@/services/invoices-service';
import { galleriesService } from '@/services/galleries-service';
import { albumsService } from '@/services/albums-service';
import { paymentsService } from '@/services/payments-service';
import { deliveriesService } from '@/services/deliveries-service';

vi.mock('@/services/bookings-service', () => ({
  bookingsService: { list: vi.fn() },
}));
vi.mock('@/services/invoices-service', () => ({
  invoicesService: { list: vi.fn() },
}));
vi.mock('@/services/galleries-service', () => ({
  galleriesService: { list: vi.fn() },
}));
vi.mock('@/services/albums-service', () => ({
  albumsService: { list: vi.fn() },
}));
vi.mock('@/services/payments-service', () => ({
  paymentsService: { list: vi.fn() },
}));
vi.mock('@/services/deliveries-service', () => ({
  deliveriesService: { list: vi.fn() },
}));

const client = {
  id: 'c1',
  clientNumber: 'CLT-000001',
  fullName: 'Asha',
  mobile: '9876543210',
  status: 'Active',
  isActive: true,
  totalBookings: 1,
  totalAmount: 1000,
  outstandingBalance: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ClientViewModal', () => {
  it('hides Edit without clients.update and loads linked history', async () => {
    vi.mocked(bookingsService.list).mockResolvedValue({
      items: [
        {
          id: 'b1',
          bookingNumber: 'BK-000001',
          eventType: 'Wedding',
          status: 'Confirmed',
        },
      ],
      total: 1,
    } as never);
    vi.mocked(invoicesService.list).mockResolvedValue({ items: [], total: 0 } as never);
    vi.mocked(galleriesService.list).mockResolvedValue({ items: [], total: 0 } as never);
    vi.mocked(albumsService.list).mockResolvedValue({ items: [], total: 0 } as never);
    vi.mocked(paymentsService.list).mockResolvedValue({ items: [], total: 0 } as never);
    vi.mocked(deliveriesService.list).mockResolvedValue({ items: [], total: 0 } as never);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ClientViewModal open client={client} canEdit={false} onClose={() => undefined} onEdit={() => undefined} />
      </QueryClientProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Edit Client' })).not.toBeInTheDocument();
    expect(await screen.findByText(/BK-000001/)).toBeInTheDocument();
  });
});

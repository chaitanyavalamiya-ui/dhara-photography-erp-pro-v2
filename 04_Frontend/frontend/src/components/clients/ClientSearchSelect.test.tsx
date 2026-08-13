import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ClientSearchSelect } from './ClientSearchSelect';
import { clientsService } from '@/services/clients-service';

vi.mock('@/services/clients-service', () => ({
  clientsService: {
    list: vi.fn(),
    getById: vi.fn(),
  },
}));

describe('ClientSearchSelect', () => {
  it('keeps the selected client available when it is outside the first page', async () => {
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
      limit: 20,
      totalPages: 1,
    } as never);
    vi.mocked(clientsService.getById).mockResolvedValue({
      id: 'selected-1',
      clientNumber: 'CLT-000099',
      fullName: 'Selected Client',
      mobile: '9888888888',
      status: 'Active',
      isActive: true,
      totalBookings: 0,
      totalAmount: 0,
      outstandingBalance: 0,
      createdAt: '',
      updatedAt: '',
    } as never);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ClientSearchSelect value="selected-1" onChange={() => undefined} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Selected Client/ })).toBeInTheDocument();
    });
    expect(clientsService.list).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, status: 'active' }),
    );
  });
});

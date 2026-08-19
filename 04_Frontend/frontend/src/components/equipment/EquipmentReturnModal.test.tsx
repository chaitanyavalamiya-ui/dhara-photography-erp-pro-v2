import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { EquipmentReturnModal } from './EquipmentReturnModal';
import { EquipmentIssue, equipmentService } from '@/services/equipment-service';

vi.mock('@/services/equipment-service', async () => {
  const actual = await vi.importActual<typeof import('@/services/equipment-service')>(
    '@/services/equipment-service',
  );
  return {
    ...actual,
    equipmentService: { returnIssue: vi.fn() },
  };
});

const issue: EquipmentIssue = {
  id: 'issue-1',
  issueNumber: 'EI-000001',
  bookingId: 'booking-1',
  bookingNumber: 'BK-000008',
  clientName: 'UAT Test Client',
  eventType: 'Wedding',
  eventDate: '2026-08-20',
  staffId: 'staff-1',
  staffName: 'Rahul',
  issuedAt: '2026-08-20T08:00:00.000Z',
  status: 'OPEN',
  items: [
    {
      id: 'item-1',
      equipmentId: 'mem-1',
      equipmentName: '256GB Memory Card',
      equipmentCode: 'MC-256',
      category: 'Memory Card',
      quantityIssued: 2,
      quantityReturned: 0,
      missingQuantity: 0,
      damagedQuantity: 0,
      conditionOut: 'GOOD',
      returnStatus: 'OUT',
    },
  ],
  summary: { totalIssued: 2, totalReturned: 0, totalMissing: 0, totalDamaged: 0 },
};

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EquipmentReturnModal open issue={issue} onClose={() => undefined} onReturned={() => undefined} />
    </QueryClientProvider>,
  );
}

describe('EquipmentReturnModal', () => {
  it('shows outstanding and does not treat leftover returned quantity as missing', async () => {
    renderModal();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    const returned = await screen.findByLabelText(/Returned quantity for 256GB Memory Card/);
    fireEvent.change(returned, { target: { value: '1' } });
    expect(screen.getByText('1 still outstanding')).toBeInTheDocument();
    expect(screen.queryByText(/WARNING: 1 ITEM MISSING/)).not.toBeInTheDocument();
  });

  it('blocks returned plus missing greater than outstanding', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText(/Returned quantity for 256GB Memory Card/), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Missing quantity for 256GB Memory Card/), { target: { value: '1' } });
    expect(screen.getByText(/Returned \+ missing cannot exceed outstanding/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Return' }));
    expect(equipmentService.returnIssue).not.toHaveBeenCalled();
  });

  it('submits explicit returned and missing quantities', async () => {
    vi.mocked(equipmentService.returnIssue).mockResolvedValue(issue);
    renderModal();
    fireEvent.change(screen.getByLabelText(/Returned quantity for 256GB Memory Card/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Missing quantity for 256GB Memory Card/), { target: { value: '0' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DAMAGED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Return' }));
    await waitFor(() => expect(equipmentService.returnIssue).toHaveBeenCalled());
    expect(equipmentService.returnIssue).toHaveBeenCalledWith(
      'issue-1',
      expect.objectContaining({
        items: [
          expect.objectContaining({
            conditionIn: 'DAMAGED',
            quantityReturned: 1,
            quantityMissing: 0,
          }),
        ],
      }),
    );
  });
});

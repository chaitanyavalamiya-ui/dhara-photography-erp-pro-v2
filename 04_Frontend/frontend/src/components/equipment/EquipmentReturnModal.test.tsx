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
  it('auto-calculates missing quantity as issued minus returned', async () => {
    renderModal();
    const qty = await screen.findByRole('spinbutton');
    fireEvent.change(qty, { target: { value: '1' } });
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/WARNING: 1 ITEM MISSING/)).toBeInTheDocument();
  });

  it('blocks returned quantity greater than issued', async () => {
    renderModal();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Return' }));
    expect(
      await screen.findByText(/Returned quantity cannot exceed issued quantity/),
    ).toBeInTheDocument();
    expect(equipmentService.returnIssue).not.toHaveBeenCalled();
  });

  it('submits damaged condition in', async () => {
    vi.mocked(equipmentService.returnIssue).mockResolvedValue(issue);
    renderModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DAMAGED' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Return' }));
    await waitFor(() => expect(equipmentService.returnIssue).toHaveBeenCalled());
    expect(equipmentService.returnIssue).toHaveBeenCalledWith(
      'issue-1',
      expect.objectContaining({
        items: [expect.objectContaining({ conditionIn: 'DAMAGED', quantityReturned: 2 })],
      }),
    );
  });
});

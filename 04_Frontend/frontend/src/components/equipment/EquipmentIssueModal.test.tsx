import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EquipmentIssueModal } from './EquipmentIssueModal';
import { equipmentService } from '@/services/equipment-service';
import { staffService } from '@/services/staff-service';

vi.mock('@/services/equipment-service', async () => {
  const actual = await vi.importActual<typeof import('@/services/equipment-service')>(
    '@/services/equipment-service',
  );
  return {
    ...actual,
    equipmentService: {
      list: vi.fn(),
      createIssue: vi.fn(),
    },
  };
});

vi.mock('@/services/staff-service', () => ({
  staffService: { list: vi.fn(), listBookingTeam: vi.fn() },
}));

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EquipmentIssueModal
        open
        bookingId="booking-1"
        onClose={() => undefined}
        onIssued={() => undefined}
      />
    </QueryClientProvider>,
  );
}

describe('EquipmentIssueModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(staffService.list).mockResolvedValue({
      items: [{ id: 'staff-1', fullName: 'Rahul', staffCode: 'ST-1' }],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    } as never);
    vi.mocked(staffService.listBookingTeam).mockResolvedValue([]);
    vi.mocked(equipmentService.list).mockResolvedValue({
      items: [
        {
          id: 'mem-1',
          code: 'MC-256',
          name: '256GB Memory Card',
          category: 'Memory Card',
          trackingType: 'bulk',
          totalQuantity: 6,
          availableQuantity: 6,
          onShootQuantity: 0,
          missingQuantity: 0,
          underRepairQuantity: 0,
          status: 'AVAILABLE',
          condition: 'GOOD',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'cam-1',
          code: 'CAM-001',
          name: 'Canon 200D Mark II',
          category: 'Camera',
          trackingType: 'serialized',
          serialNumber: 'CAM-001',
          totalQuantity: 1,
          availableQuantity: 0,
          onShootQuantity: 1,
          missingQuantity: 0,
          underRepairQuantity: 0,
          status: 'ON_SHOOT',
          condition: 'GOOD',
          createdAt: '',
          updatedAt: '',
        },
      ],
      total: 2,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
  });

  it('lists available equipment and hides items already on shoot', async () => {
    renderModal();
    expect(await screen.findByText('256GB Memory Card')).toBeInTheDocument();
    expect(screen.queryByText('Canon 200D Mark II')).not.toBeInTheDocument();
  });

  it('keeps staff outside the booking selectable', async () => {
    vi.mocked(staffService.listBookingTeam).mockResolvedValue([
      {
        id: 'asg-1',
        staffId: 'staff-team',
        staffCode: 'ST-9',
        staffName: 'Ramesh',
        role: 'photographer',
        roleLabel: 'Photographer',
      },
    ]);
    vi.mocked(staffService.list).mockResolvedValue({
      items: [
        { id: 'staff-team', fullName: 'Ramesh', staffCode: 'ST-9' },
        { id: 'staff-1', fullName: 'Rahul', staffCode: 'ST-1' },
      ],
      total: 2,
      page: 1,
      limit: 100,
      totalPages: 1,
    } as never);
    renderModal();
    expect(await screen.findByRole('option', { name: 'Rahul' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ramesh' })).toBeInTheDocument();
  });

  it('validates quantity against available stock', async () => {
    renderModal();
    expect(await screen.findByText('256GB Memory Card')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Staff member' }), {
      target: { value: 'staff-1' },
    });
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue Equipment' }));
    expect(await screen.findByText(/Cannot issue more than 6/)).toBeInTheDocument();
    expect(equipmentService.createIssue).not.toHaveBeenCalled();
  });
});

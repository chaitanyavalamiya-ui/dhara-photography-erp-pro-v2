import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffViewModal } from './StaffViewModal';
import { equipmentService } from '@/services/equipment-service';
import { useAuthStore } from '@/stores/auth-store';
import type { StaffDetail } from '@/services/staff-service';

vi.mock('@/services/equipment-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/equipment-service')>();
  return {
    ...actual,
    equipmentService: {
      ...actual.equipmentService,
      getStaffSummary: vi.fn(),
    },
  };
});

const staff: StaffDetail = {
  id: 'staff-ramesh',
  staffCode: 'ST-1',
  fullName: 'Ramesh',
  role: 'photographer',
  roleLabel: 'Photographer',
  paymentType: 'per_event',
  paymentTypeLabel: 'Per event',
  defaultRate: 0,
  isActive: true,
  totalAssignments: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  upcomingBookings: [],
  recentCompletedBookings: [],
  recentExpenses: [],
  totalExpenseAmount: 0,
};

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StaffViewModal open staff={staff} onClose={() => undefined} onEdit={() => undefined} />
    </QueryClientProvider>,
  );
}

describe('StaffViewModal currently holding equipment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'admin@local',
        companyId: 'c1',
        permissions: ['equipment.read', 'staff.read'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
    vi.mocked(equipmentService.getStaffSummary).mockResolvedValue({
      staffId: 'staff-ramesh',
      staffName: 'Ramesh',
      totalIssues: 1,
      currentlyHolding: 1,
      returned: 1,
      missing: 0,
      damaged: 0,
      issues: [
        {
          id: 'issue-1',
          issueNumber: 'EI-000010',
          bookingId: 'b1',
          bookingNumber: 'BK-000008',
          clientName: 'Rahul & Priya',
          staffId: 'staff-ramesh',
          staffName: 'Ramesh',
          issuedAt: '2026-08-20T08:00:00.000Z',
          status: 'PARTIAL',
          items: [
            {
              id: 'item-cam',
              equipmentId: 'cam-1',
              equipmentName: 'Canon Camera',
              equipmentCode: 'CAM-001',
              category: 'Camera',
              quantityIssued: 1,
              quantityReturned: 0,
              missingQuantity: 0,
              damagedQuantity: 0,
              conditionOut: 'GOOD',
              returnStatus: 'OUT',
            },
            {
              id: 'item-lens',
              equipmentId: 'lens-1',
              equipmentName: '24-70mm Lens',
              equipmentCode: 'LN-2470',
              category: 'Lens',
              quantityIssued: 1,
              quantityReturned: 1,
              missingQuantity: 0,
              damagedQuantity: 0,
              conditionOut: 'GOOD',
              returnStatus: 'RETURNED',
            },
          ],
          summary: { totalIssued: 2, totalReturned: 1, totalMissing: 0, totalDamaged: 0 },
        },
      ],
    });
  });

  it('shows remaining equipment with booking and hides fully returned items', async () => {
    renderModal();

    expect(await screen.findByText(/Canon Camera \(CAM-001\) × 1/)).toBeInTheDocument();
    expect(screen.getByText('Currently Holding Equipment')).toBeInTheDocument();
    expect(screen.getAllByText(/BK-000008/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/24-70mm Lens/)).not.toBeInTheDocument();
    expect(screen.getByText('Equipment History')).toBeInTheDocument();
    expect(screen.getByText(/EI-000010 · BK-000008/)).toBeInTheDocument();
  });
});

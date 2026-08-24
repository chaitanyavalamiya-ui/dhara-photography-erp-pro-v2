import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingInventorySection } from './BookingInventorySection';
import { equipmentService } from '@/services/equipment-service';
import { staffService } from '@/services/staff-service';
import { useAuthStore } from '@/stores/auth-store';
import type { Booking } from '@/services/bookings-service';

vi.mock('@/services/equipment-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/equipment-service')>();
  return {
    ...actual,
    equipmentService: {
      ...actual.equipmentService,
      getBookingOverview: vi.fn(),
    },
  };
});

vi.mock('@/services/staff-service', () => ({
  staffService: {
    listBookingTeam: vi.fn(),
  },
}));

const booking: Booking = {
  id: 'booking-1',
  bookingNumber: 'BK-000008',
  clientId: 'client-1',
  client: { id: 'client-1', fullName: 'Rahul & Priya', mobile: '9876543210' },
  eventType: 'Wedding',
  eventDate: '2026-08-20',
  items: [],
  servicesSummary: '',
  subtotal: 0,
  discount: 0,
  totalAmount: 0,
  advanceAmount: 0,
  balanceAmount: 0,
  status: 'Confirmed',
  statusCode: 'confirmed',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BookingInventorySection booking={booking} />
    </QueryClientProvider>,
  );
}

describe('BookingInventorySection staff grouping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'admin@local',
        companyId: 'c1',
        permissions: ['equipment.read', 'equipment.issue', 'equipment.return'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
    vi.mocked(staffService.listBookingTeam).mockResolvedValue([]);
    vi.mocked(equipmentService.getBookingOverview).mockResolvedValue({
      used: [],
      summary: { totalIssued: 3, totalReturned: 1, totalMissing: 0, totalDamaged: 0 },
      issues: [
        {
          id: 'issue-r',
          issueNumber: 'EI-1',
          bookingId: 'booking-1',
          bookingNumber: 'BK-000008',
          clientName: 'Rahul & Priya',
          staffId: 'staff-ramesh',
          staffName: 'Ramesh',
          issuedAt: '2026-08-20T08:00:00.000Z',
          status: 'OPEN',
          items: [
            {
              id: 'cam',
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
          ],
          summary: { totalIssued: 1, totalReturned: 0, totalMissing: 0, totalDamaged: 0 },
        },
        {
          id: 'issue-m',
          issueNumber: 'EI-2',
          bookingId: 'booking-1',
          bookingNumber: 'BK-000008',
          clientName: 'Rahul & Priya',
          staffId: 'staff-mahesh',
          staffName: 'Mahesh',
          issuedAt: '2026-08-20T08:30:00.000Z',
          status: 'PARTIAL',
          items: [
            {
              id: 'tripod',
              equipmentId: 'tr-1',
              equipmentName: 'Tripod',
              equipmentCode: 'TR-1',
              category: 'Support',
              quantityIssued: 1,
              quantityReturned: 1,
              missingQuantity: 0,
              damagedQuantity: 0,
              conditionOut: 'GOOD',
              returnStatus: 'RETURNED',
            },
          ],
          summary: { totalIssued: 1, totalReturned: 1, totalMissing: 0, totalDamaged: 0 },
        },
      ],
    });
  });

  it('shows equipment under the karigar who took it with out vs returned state', async () => {
    renderSection();

    expect(await screen.findByText('Canon Camera × 1 — Out')).toBeInTheDocument();
    expect(screen.getByText('Studio Equipment Issue')).toBeInTheDocument();
    expect(screen.getByText('Ramesh')).toBeInTheDocument();
    expect(screen.getByText('Mahesh')).toBeInTheDocument();
    expect(screen.getByText('Mahesh')).toBeInTheDocument();
    expect(screen.getByText('Tripod × 1 — Returned')).toBeInTheDocument();
    expect(screen.queryByText('Canon Camera × 1 — Returned')).not.toBeInTheDocument();
  });
});

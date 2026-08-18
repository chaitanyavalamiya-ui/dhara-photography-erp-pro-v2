import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EquipmentPage } from './EquipmentPage';
import { equipmentService } from '@/services/equipment-service';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('@/services/equipment-service', async () => {
  const actual = await vi.importActual<typeof import('@/services/equipment-service')>(
    '@/services/equipment-service',
  );
  return {
    ...actual,
    equipmentService: {
      list: vi.fn(),
      listCategories: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      getById: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
    },
  };
});

const categories = [
  { id: 'c1', category: 'equipment_category', code: 'camera', label: 'Camera', sortOrder: 1, isActive: true, updatedAt: '2026-08-18T00:00:00.000Z' },
  { id: 'c2', category: 'equipment_category', code: 'lens', label: 'Lens', sortOrder: 2, isActive: true, updatedAt: '2026-08-18T00:00:00.000Z' },
  { id: 'c3', category: 'equipment_category', code: 'memory_card', label: 'Memory Card', sortOrder: 3, isActive: true, updatedAt: '2026-08-18T00:00:00.000Z' },
];

const lensItem = {
  id: 'len-1',
  code: 'LEN-001',
  name: 'Canon 50mm f/1.8',
  category: 'Camera',
  trackingType: 'serialized' as const,
  serialNumber: 'N50-001',
  totalQuantity: 1,
  availableQuantity: 1,
  onShootQuantity: 0,
  missingQuantity: 0,
  underRepairQuantity: 0,
  status: 'AVAILABLE',
  condition: 'GOOD',
  notes: null,
  createdAt: '2026-08-18T00:00:00.000Z',
  updatedAt: '2026-08-18T00:00:00.000Z',
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <EquipmentPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('EquipmentPage categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'admin@example.com',
        companyId: 'c1',
        permissions: ['equipment.read', 'equipment.write'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
    vi.mocked(equipmentService.listCategories).mockResolvedValue(categories);
    vi.mocked(equipmentService.list).mockResolvedValue({
      items: [lensItem],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    vi.mocked(equipmentService.update).mockResolvedValue({ ...lensItem, category: 'Lens' });
    vi.mocked(equipmentService.create).mockResolvedValue({
      ...lensItem,
      id: 'sd-1',
      code: 'SD-256',
      name: 'SanDisk Extreme Pro',
      category: 'Memory Card',
      trackingType: 'bulk',
      serialNumber: null,
      totalQuantity: 5,
      availableQuantity: 5,
      specifications: { capacity: 256, capacityUnit: 'GB', speedClass: 'V30', type: 'SDXC' },
    });
    vi.mocked(equipmentService.getById).mockResolvedValue({
      ...lensItem,
      category: 'Lens',
      specifications: { focalLength: '50mm', aperture: 'f/1.8', mount: 'EF', stabilization: 'No' },
      history: [],
    });
  });

  it('loads category master data into the filter', async () => {
    renderPage();
    expect(await screen.findByText('Canon 50mm f/1.8')).toBeInTheDocument();
    const filter = screen.getByLabelText('Category filter');
    expect(filter).toContainHTML('Camera');
    expect(filter).toContainHTML('Lens');
    fireEvent.change(filter, { target: { value: 'lens' } });
    await waitFor(() => {
      expect(equipmentService.list).toHaveBeenCalledWith(expect.objectContaining({ category: 'lens' }));
    });
  });

  it('edits the Canon 50mm category from Camera to Lens', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Edit/i }));
    const categorySelect = screen.getByLabelText('Category');
    fireEvent.change(categorySelect, { target: { value: 'lens' } });
    expect(screen.getByLabelText('Focal Length')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(equipmentService.update).toHaveBeenCalledWith(
        'len-1',
        expect.objectContaining({ category: 'lens' }),
      );
    });
  });

  it('shows camera specification fields when Camera is selected', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Add Equipment/i }));
    expect(screen.getByLabelText('Sensor')).toBeInTheDocument();
    expect(screen.getByLabelText('Resolution')).toBeInTheDocument();
  });

  it('shows memory card capacity fields and saves specifications', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Add Equipment/i }));
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'memory_card' } });
    expect(screen.getByLabelText('Capacity')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Code (CAM-001)'), { target: { value: 'SD-256' } });
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'SanDisk Extreme Pro' } });
    fireEvent.change(screen.getByLabelText('Capacity'), { target: { value: '256' } });
    fireEvent.change(screen.getByLabelText('Capacity Unit'), { target: { value: 'GB' } });
    fireEvent.change(screen.getByLabelText('Speed Class'), { target: { value: 'V30' } });
    fireEvent.change(screen.getByLabelText('Card Type'), { target: { value: 'SDXC' } });
    fireEvent.change(screen.getByLabelText('Total quantity'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(vi.mocked(equipmentService.create).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          name: 'SanDisk Extreme Pro',
          category: 'memory_card',
          totalQuantity: 5,
          specifications: {
            capacity: 256,
            capacityUnit: 'GB',
            speedClass: 'V30',
            type: 'SDXC',
          },
        }),
      );
    });
  });

  it('edits lens specifications without changing tracking type', async () => {
    vi.mocked(equipmentService.list).mockResolvedValue({
      items: [{ ...lensItem, category: 'Lens' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    vi.mocked(equipmentService.update).mockResolvedValue({
      ...lensItem,
      category: 'Lens',
      specifications: { focalLength: '50mm', aperture: 'f/1.8', mount: 'EF', stabilization: 'No' },
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Edit/i }));
    expect(screen.getByLabelText('Focal Length')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Focal Length'), { target: { value: '50mm' } });
    fireEvent.change(screen.getByLabelText('Maximum Aperture'), { target: { value: 'f/1.8' } });
    fireEvent.change(screen.getByLabelText('Mount'), { target: { value: 'EF' } });
    fireEvent.change(screen.getByLabelText('Stabilization'), { target: { value: 'No' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(vi.mocked(equipmentService.update).mock.calls[0]).toEqual([
        'len-1',
        expect.objectContaining({
          category: 'lens',
          specifications: {
            focalLength: '50mm',
            aperture: 'f/1.8',
            mount: 'EF',
            stabilization: 'No',
          },
        }),
      ]);
    });
    expect(vi.mocked(equipmentService.update).mock.calls[0][1]).not.toHaveProperty('trackingType');
  });

  it('displays friendly specification values in history/details', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /History/i }));
    expect(await screen.findByText('50mm')).toBeInTheDocument();
    expect(screen.getByText('Focal Length')).toBeInTheDocument();
  });
});

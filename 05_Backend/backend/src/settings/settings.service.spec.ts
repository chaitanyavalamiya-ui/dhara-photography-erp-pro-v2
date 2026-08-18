import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EQUIPMENT_MASTER_CATEGORY } from '../equipment/utils/equipment.utils';

describe('SettingsService equipment categories', () => {
  let service: SettingsService;
  const store = {
    master: [] as Array<Record<string, unknown>>,
    equipment: [] as Array<Record<string, unknown>>,
  };

  const prisma = {
    masterData: {
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        store.master.filter(
          (row) =>
            row.companyId === where.companyId &&
            row.category === where.category &&
            (!where.isActive || row.isActive === true),
        ),
      ),
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return (
          store.master.find((row) => {
            if (typeof where.id === 'string' && row.id !== where.id) return false;
            const notId = typeof where.id === 'object' && where.id ? (where.id as { not?: string }).not : undefined;
            if (notId && row.id === notId) return false;
            if (where.companyId && row.companyId !== where.companyId) return false;
            if (where.category && row.category !== where.category) return false;
            if (where.code && row.code !== where.code) return false;
            if (where.archivedAt === null && row.archivedAt) return false;
            const labelFilter = where.label as { equals?: string } | undefined;
            if (labelFilter?.equals && String(row.label).toLowerCase() !== labelFilter.equals.toLowerCase()) {
              return false;
            }
            return true;
          }) ?? null
        );
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `cat-${store.master.length + 1}`,
          isActive: true,
          archivedAt: null,
          sortOrder: 0,
          updatedAt: new Date(),
          ...data,
        };
        store.master.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = store.master.find((item) => item.id === where.id) as Record<string, unknown>;
        Object.assign(row, data);
        return row;
      }),
    },
    equipment: {
      updateMany: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const labels = (where.category as { in?: string[] } | string | undefined);
        const accepted = typeof labels === 'object' && labels && 'in' in labels ? labels.in ?? [] : [];
        let count = 0;
        for (const row of store.equipment) {
          if (row.companyId !== where.companyId) continue;
          if (accepted.length === 0 || accepted.includes(String(row.category))) {
            Object.assign(row, data);
            count += 1;
          }
        }
        return { count };
      }),
    },
    expense: { count: jest.fn() },
    payment: { count: jest.fn() },
  };

  const audit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    store.master = [
      {
        id: 'lens-1',
        companyId: 'company-1',
        category: EQUIPMENT_MASTER_CATEGORY,
        code: 'lens',
        label: 'Lens',
        sortOrder: 2,
        isActive: true,
        archivedAt: null,
        updatedAt: new Date(),
      },
      {
        id: 'cam-cat',
        companyId: 'company-1',
        category: EQUIPMENT_MASTER_CATEGORY,
        code: 'camera',
        label: 'Camera',
        sortOrder: 1,
        isActive: true,
        archivedAt: null,
        updatedAt: new Date(),
      },
    ];
    store.equipment = [
      {
        id: 'eq-1',
        companyId: 'company-1',
        code: 'LEN-001',
        name: 'Canon 50mm f/1.8',
        category: 'Camera',
      },
    ];

    const module = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(SettingsService);
  });

  it('lists equipment categories for the company', async () => {
    const rows = await service.getMasterData('company-1', EQUIPMENT_MASTER_CATEGORY);
    expect(rows.map((row) => row.code).sort()).toEqual(['camera', 'lens']);
  });

  it('creates an equipment category', async () => {
    const created = await service.createMasterData('company-1', 'user-1', {
      category: EQUIPMENT_MASTER_CATEGORY,
      code: 'bag',
      label: 'Bag',
    });
    expect(created.label).toBe('Bag');
    expect(store.master).toHaveLength(3);
  });

  it('rejects duplicate equipment category names in the same company', async () => {
    await expect(
      service.createMasterData('company-1', 'user-1', {
        category: EQUIPMENT_MASTER_CATEGORY,
        code: 'lens_2',
        label: 'lens',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('isolates equipment categories by company', async () => {
    const rows = await service.getMasterData('company-2', EQUIPMENT_MASTER_CATEGORY);
    expect(rows).toEqual([]);
  });

  it('renames a category and updates equipment using the old label', async () => {
    const updated = await service.updateMasterData('company-1', 'user-1', 'cam-cat', {
      label: 'Cameras',
    });
    expect(updated.label).toBe('Cameras');
    expect(prisma.equipment.updateMany).toHaveBeenCalled();
    expect(store.equipment[0].category).toBe('Cameras');
  });

  it('deactivates an equipment category even when equipment still uses it', async () => {
    const updated = await service.updateMasterData('company-1', 'user-1', 'cam-cat', {
      isActive: false,
    });
    expect(updated.isActive).toBe(false);
  });

  it('does not deactivate expense categories that are in use', async () => {
    store.master.push({
      id: 'fuel-1',
      companyId: 'company-1',
      category: 'expense_category',
      code: 'fuel',
      label: 'Fuel',
      isActive: true,
      archivedAt: null,
      sortOrder: 0,
      updatedAt: new Date(),
    });
    prisma.expense.count.mockResolvedValueOnce(1);
    await expect(
      service.updateMasterData('company-1', 'user-1', 'fuel-1', { isActive: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns not found for another company id', async () => {
    await expect(
      service.updateMasterData('company-2', 'user-1', 'cam-cat', { label: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

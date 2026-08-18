import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EquipmentService } from './equipment.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';

describe('EquipmentService', () => {
  let service: EquipmentService;

  const store: {
    equipment: Array<Record<string, unknown>>;
    issues: Array<Record<string, unknown>>;
    items: Array<Record<string, unknown>>;
    returns: Array<Record<string, unknown>>;
    returnItems: Array<Record<string, unknown>>;
    history: Array<Record<string, unknown>>;
  } = {
    equipment: [],
    issues: [],
    items: [],
    returns: [],
    returnItems: [],
    history: [],
  };

  const booking = {
    id: 'booking-1',
    companyId: 'company-1',
    bookingNumber: 'BK-000008',
    eventType: 'Wedding',
    eventDate: new Date('2026-08-20T00:00:00.000Z'),
    archivedAt: null,
    client: { fullName: 'UAT Test Client' },
  };
  const staff = {
    id: 'staff-1',
    companyId: 'company-1',
    fullName: 'Rahul',
    staffCode: 'ST-001',
    archivedAt: null,
  };

  function nowFields() {
    const now = new Date();
    return { createdAt: now, updatedAt: now };
  }

  const tx = {
    equipment: {
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        store.equipment.find((row) => row.id === where.id && row.companyId === where.companyId),
      ),
      findFirstOrThrow: jest.fn(async ({ where }: { where: { id: string } }) => {
        const row = store.equipment.find((item) => item.id === where.id);
        if (!row) throw new Error('missing');
        return row;
      }),
      updateMany: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const row = store.equipment.find((item) => item.id === where.id) as Record<string, number | string>;
        if (!row) return { count: 0 };
        if (where.status && row.status !== where.status) return { count: 0 };
        const gte = (where.availableQuantity as { gte?: number } | undefined)?.gte;
        if (gte !== undefined && Number(row.availableQuantity) < gte) return { count: 0 };
        if (typeof data.availableQuantity === 'object' && data.availableQuantity && 'decrement' in (data.availableQuantity as object)) {
          row.availableQuantity =
            Number(row.availableQuantity) - Number((data.availableQuantity as { decrement: number }).decrement);
        } else if (typeof data.availableQuantity === 'number') {
          row.availableQuantity = data.availableQuantity;
        }
        if (typeof data.onShootQuantity === 'object' && data.onShootQuantity && 'increment' in (data.onShootQuantity as object)) {
          row.onShootQuantity =
            Number(row.onShootQuantity) + Number((data.onShootQuantity as { increment: number }).increment);
        } else if (typeof data.onShootQuantity === 'number') {
          row.onShootQuantity = data.onShootQuantity;
        }
        if (data.status) row.status = data.status as string;
        return { count: 1 };
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = store.equipment.find((item) => item.id === where.id) as Record<string, unknown>;
        Object.assign(row, data);
        return row;
      }),
    },
    equipmentIssue: {
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if (where.companyId && !where.id) {
          return store.issues[store.issues.length - 1] ?? null;
        }
        return store.issues.find((row) => row.id === where.id && row.companyId === where.companyId) ?? null;
      }),
      findFirstOrThrow: jest.fn(async ({ where }: { where: { id: string } }) => hydrateIssue(where.id)),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: 'issue-1', ...data, ...nowFields() };
        store.issues.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = store.issues.find((item) => item.id === where.id) as Record<string, unknown>;
        Object.assign(row, data);
        return row;
      }),
    },
    equipmentIssueItem: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `item-${store.items.length + 1}`,
          quantityReturned: 0,
          missingQuantity: 0,
          damagedQuantity: 0,
          returnStatus: 'OUT',
          ...data,
          ...nowFields(),
        };
        store.items.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where }: { where: { issueId: string } }) =>
        store.items.filter((row) => row.issueId === where.issueId),
      ),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = store.items.find((item) => item.id === where.id) as Record<string, unknown>;
        Object.assign(row, data);
        return row;
      }),
    },
    equipmentReturn: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: 'return-1', ...data };
        store.returns.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = store.returns.find((item) => item.id === where.id) as Record<string, unknown>;
        Object.assign(row, data);
        return row;
      }),
    },
    equipmentReturnItem: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        store.returnItems.push(data);
        return data;
      }),
    },
    equipmentHistory: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        store.history.push(data);
        return data;
      }),
    },
  };

  function hydrateIssue(id: string) {
    const issue = store.issues.find((row) => row.id === id);
    if (!issue) throw new Error('missing issue');
    return {
      ...issue,
      booking,
      staff,
      items: store.items
        .filter((item) => item.issueId === id)
        .map((item) => ({
          ...item,
          equipment: store.equipment.find((eq) => eq.id === item.equipmentId),
        })),
    };
  }

  const prisma = {
    ...tx,
    $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    booking: {
      findFirst: jest.fn(async ({ where }: { where: { id: string; companyId: string } }) =>
        where.companyId === 'company-1' && where.id === booking.id ? booking : null,
      ),
    },
    staff: {
      findFirst: jest.fn(async ({ where }: { where: { id: string; companyId: string } }) =>
        where.companyId === 'company-1' && where.id === staff.id ? staff : null,
      ),
    },
    equipment: {
      ...tx.equipment,
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return (
          store.equipment.find((row) => {
            if (where.id && typeof where.id === 'string' && row.id !== where.id) return false;
            const notId = typeof where.id === 'object' && where.id ? (where.id as { not?: string }).not : undefined;
            if (notId && row.id === notId) return false;
            if (where.companyId && row.companyId !== where.companyId) return false;
            if (where.code && row.code !== where.code) return false;
            if (where.serialNumber && row.serialNumber !== where.serialNumber) return false;
            if (where.archivedAt === null && row.archivedAt) return false;
            return Boolean(where.id || where.code || where.serialNumber);
          }) ?? null
        );
      }),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `eq-${store.equipment.length + 1}`, ...data, ...nowFields() };
        store.equipment.push(row);
        return row;
      }),
      aggregate: jest.fn(),
    },
    masterData: {
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const categories = [
          { id: 'cat-camera', companyId: 'company-1', category: 'equipment_category', code: 'camera', label: 'Camera', isActive: true, archivedAt: null },
          { id: 'cat-lens', companyId: 'company-1', category: 'equipment_category', code: 'lens', label: 'Lens', isActive: true, archivedAt: null },
          { id: 'cat-memory', companyId: 'company-1', category: 'equipment_category', code: 'memory_card', label: 'Memory Card', isActive: true, archivedAt: null },
          { id: 'cat-retired', companyId: 'company-1', category: 'equipment_category', code: 'retired', label: 'Retired', isActive: false, archivedAt: null },
        ];
        return (
          categories.find((row) => {
            if (where.companyId && row.companyId !== where.companyId) return false;
            if (where.isActive === true && !row.isActive) return false;
            const or = where.OR as Array<Record<string, { equals?: string }>> | undefined;
            if (or?.length) {
              const terms = or.flatMap((item) => [item.code?.equals, item.label?.equals]).filter(Boolean);
              return terms.some((term) => row.code.toLowerCase() === String(term).toLowerCase() || row.label.toLowerCase() === String(term).toLowerCase());
            }
            return false;
          }) ?? null
        );
      }),
    },
    equipmentIssue: {
      ...tx.equipmentIssue,
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return store.issues
          .filter((row) => row.companyId === where.companyId)
          .filter((row) => !where.bookingId || row.bookingId === where.bookingId)
          .filter((row) => !where.staffId || row.staffId === where.staffId)
          .map((issue) => hydrateIssue(issue.id as string));
      }),
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const row = store.issues.find((item) => item.id === where.id && item.companyId === where.companyId);
        if (!row) return null;
        return { ...hydrateIssue(row.id as string), items: store.items.filter((item) => item.issueId === row.id) };
      }),
    },
  };

  const audit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    store.equipment = [
      {
        id: 'mem-1',
        companyId: 'company-1',
        code: 'MC-256',
        name: '256GB Memory Card',
        category: 'Memory Card',
        trackingType: 'bulk',
        serialNumber: null,
        totalQuantity: 6,
        availableQuantity: 6,
        onShootQuantity: 0,
        missingQuantity: 0,
        underRepairQuantity: 0,
        status: 'AVAILABLE',
        condition: 'GOOD',
        notes: null,
        isActive: true,
        archivedAt: null,
        ...nowFields(),
      },
      {
        id: 'cam-1',
        companyId: 'company-1',
        code: 'CAM-001',
        name: 'Canon 200D Mark II',
        category: 'Camera',
        trackingType: 'serialized',
        serialNumber: 'CAM-001',
        totalQuantity: 1,
        availableQuantity: 1,
        onShootQuantity: 0,
        missingQuantity: 0,
        underRepairQuantity: 0,
        status: 'AVAILABLE',
        condition: 'GOOD',
        notes: null,
        isActive: true,
        archivedAt: null,
        ...nowFields(),
      },
      {
        id: 'len-1',
        companyId: 'company-1',
        code: 'LEN-001',
        name: 'Canon 50mm f/1.8',
        category: 'Camera',
        trackingType: 'serialized',
        serialNumber: 'N50-001',
        totalQuantity: 1,
        availableQuantity: 1,
        onShootQuantity: 0,
        missingQuantity: 0,
        underRepairQuantity: 0,
        status: 'AVAILABLE',
        condition: 'GOOD',
        notes: null,
        isActive: true,
        archivedAt: null,
        ...nowFields(),
      },
    ];
    store.issues = [];
    store.items = [];
    store.returns = [];
    store.returnItems = [];
    store.history = [];

    const module = await Test.createTestingModule({
      providers: [
        EquipmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: SettingsService, useValue: { getMasterData: jest.fn(), createMasterData: jest.fn(), updateMasterData: jest.fn() } },
      ],
    }).compile();
    service = module.get(EquipmentService);
  });

  it('issues equipment, decreases available quantity, and links booking + staff', async () => {
    const result = await service.createIssue('company-1', 'user-1', {
      bookingId: 'booking-1',
      staffId: 'staff-1',
      items: [{ equipmentId: 'mem-1', quantityIssued: 2, conditionOut: 'GOOD' }],
    });

    expect(result.bookingNumber).toBe('BK-000008');
    expect(result.staffName).toBe('Rahul');
    expect(result.summary.totalIssued).toBe(2);
    expect(store.equipment[0].availableQuantity).toBe(4);
    expect(store.equipment[0].onShootQuantity).toBe(2);
    expect(store.history[0]).toMatchObject({ action: 'ISSUED', quantity: 2 });
  });

  it('does not allow issuing more than available', async () => {
    await expect(
      service.createIssue('company-1', 'user-1', {
        bookingId: 'booking-1',
        staffId: 'staff-1',
        items: [{ equipmentId: 'mem-1', quantityIssued: 9, conditionOut: 'GOOD' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(store.equipment[0].availableQuantity).toBe(6);
  });

  it('does not allow a serialized item to be issued twice', async () => {
    await service.createIssue('company-1', 'user-1', {
      bookingId: 'booking-1',
      staffId: 'staff-1',
      items: [{ equipmentId: 'cam-1', quantityIssued: 1, conditionOut: 'GOOD' }],
    });
    store.issues = [];
    store.items = [];
    await expect(
      service.createIssue('company-1', 'user-1', {
        bookingId: 'booking-1',
        staffId: 'staff-1',
        items: [{ equipmentId: 'cam-1', quantityIssued: 1, conditionOut: 'GOOD' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns equipment, restores available qty, and records missing', async () => {
    await service.createIssue('company-1', 'user-1', {
      bookingId: 'booking-1',
      staffId: 'staff-1',
      items: [{ equipmentId: 'mem-1', quantityIssued: 2, conditionOut: 'GOOD' }],
    });
    const issueItemId = store.items[0].id as string;

    const returned = await service.returnIssue('company-1', 'user-1', 'issue-1', {
      items: [{ issueItemId, quantityReturned: 1, conditionIn: 'GOOD' }],
    });

    expect(returned.summary.totalReturned).toBe(1);
    expect(returned.summary.totalMissing).toBe(1);
    expect(returned.status).toBe('MISSING');
    expect(store.equipment[0].availableQuantity).toBe(5);
    expect(store.equipment[0].onShootQuantity).toBe(0);
    expect(store.equipment[0].missingQuantity).toBe(1);
    expect(store.history.some((row) => row.action === 'MISSING')).toBe(true);
  });

  it('rejects returned quantity greater than issued', async () => {
    await service.createIssue('company-1', 'user-1', {
      bookingId: 'booking-1',
      staffId: 'staff-1',
      items: [{ equipmentId: 'mem-1', quantityIssued: 2, conditionOut: 'GOOD' }],
    });
    await expect(
      service.returnIssue('company-1', 'user-1', 'issue-1', {
        items: [{ issueItemId: store.items[0].id as string, quantityReturned: 3, conditionIn: 'GOOD' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks damaged serialized gear UNDER_REPAIR and does not restore availability', async () => {
    await service.createIssue('company-1', 'user-1', {
      bookingId: 'booking-1',
      staffId: 'staff-1',
      items: [{ equipmentId: 'cam-1', quantityIssued: 1, conditionOut: 'GOOD' }],
    });
    const returned = await service.returnIssue('company-1', 'user-1', 'issue-1', {
      items: [{ issueItemId: store.items[0].id as string, quantityReturned: 1, conditionIn: 'DAMAGED' }],
    });

    expect(returned.summary.totalDamaged).toBe(1);
    expect(store.equipment[1].status).toBe('UNDER_REPAIR');
    expect(store.equipment[1].availableQuantity).toBe(0);
    expect(store.equipment[1].underRepairQuantity).toBe(1);
  });

  it('isolates company data', async () => {
    await expect(service.createIssue('company-2', 'user-1', {
      bookingId: 'booking-1',
      staffId: 'staff-1',
      items: [{ equipmentId: 'mem-1', quantityIssued: 1, conditionOut: 'GOOD' }],
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects assigning an inactive category to new equipment', async () => {
    await expect(
      service.create('company-1', 'user-1', {
        code: 'X-1',
        name: 'Old kit',
        category: 'retired',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('edits Canon 50mm f/1.8 from Camera to Lens without resetting serial or availability', async () => {
    const updated = await service.update('company-1', 'user-1', 'len-1', { category: 'lens' });
    expect(updated.category).toBe('Lens');
    expect(updated.serialNumber).toBe('N50-001');
    expect(updated.availableQuantity).toBe(1);
    expect(updated.status).toBe('AVAILABLE');
  });

  it('does not allow duplicate serialized identifiers', async () => {
    await expect(
      service.create('company-1', 'user-1', {
        code: 'LEN-002',
        name: 'Another 50mm',
        category: 'lens',
        trackingType: 'serialized',
        serialNumber: 'N50-001',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a memory card with capacity specifications', async () => {
    const created = await service.create('company-1', 'user-1', {
      code: 'SD-256',
      name: 'SanDisk Extreme Pro',
      category: 'memory_card',
      trackingType: 'bulk',
      totalQuantity: 5,
      specifications: {
        capacity: 256,
        capacityUnit: 'GB',
        speedClass: 'V30',
        type: 'SDXC',
      },
    });
    expect(created.availableQuantity).toBe(5);
    expect(created.specifications).toEqual({
      capacity: 256,
      capacityUnit: 'GB',
      speedClass: 'V30',
      type: 'SDXC',
    });
  });

  it('adds lens specifications without resetting inventory or serial', async () => {
    const updated = await service.update('company-1', 'user-1', 'len-1', {
      category: 'lens',
      specifications: {
        focalLength: '50mm',
        aperture: 'f/1.8',
        mount: 'EF',
        stabilization: 'No',
      },
    });
    expect(updated.category).toBe('Lens');
    expect(updated.specifications).toMatchObject({ focalLength: '50mm', aperture: 'f/1.8', mount: 'EF' });
    expect(updated.serialNumber).toBe('N50-001');
    expect(updated.availableQuantity).toBe(1);
    expect(updated.onShootQuantity).toBe(0);
  });

  it('adds camera specifications without changing quantities', async () => {
    const updated = await service.update('company-1', 'user-1', 'cam-1', {
      specifications: {
        sensor: 'APS-C',
        resolution: '24.1 MP',
        mount: 'EF-S',
        videoResolution: '4K',
      },
    });
    expect(updated.specifications).toMatchObject({ sensor: 'APS-C', resolution: '24.1 MP' });
    expect(updated.availableQuantity).toBe(1);
    expect(updated.onShootQuantity).toBe(0);
  });

  it('allows existing equipment without specifications', async () => {
    const updated = await service.update('company-1', 'user-1', 'mem-1', { name: '256GB Memory Card' });
    expect(updated.specifications).toBeNull();
    expect(updated.availableQuantity).toBe(6);
  });

  it('rejects invalid specification payloads', async () => {
    await expect(
      service.create('company-1', 'user-1', {
        code: 'BAD-1',
        name: 'Bad card',
        category: 'memory_card',
        specifications: { capacity: -10, capacityUnit: 'GB' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create('company-1', 'user-1', {
        code: 'BAD-2',
        name: 'Bad card',
        category: 'memory_card',
        specifications: { exploit: 'yes' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('isolates specification writes by company', async () => {
    await expect(
      service.create('company-2', 'user-1', {
        code: 'SD-X',
        name: 'Card',
        category: 'memory_card',
        specifications: { capacity: 64, capacityUnit: 'GB' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

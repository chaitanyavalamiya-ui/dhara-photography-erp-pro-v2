import { Test } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('SettingsService service rates', () => {
  let service: SettingsService;
  const rate = {
    id: 'rate-1',
    companyId: 'company-1',
    code: 'photo_day',
    name: 'Photography Day',
    category: 'photography',
    defaultRate: 15000,
    unit: 'day',
    sortOrder: 1,
    isActive: true,
    updatedAt: new Date(),
  };

  const prisma = {
    serviceRate: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const audit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.serviceRate.findFirst.mockResolvedValue(rate);
    prisma.serviceRate.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...rate,
      ...data,
    }));
    const module = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(SettingsService);
  });

  it('deactivates a service rate without deleting it', async () => {
    const updated = await service.updateServiceRate('company-1', 'user-1', 'rate-1', {
      defaultRate: 15000,
      isActive: false,
    });
    expect(updated.isActive).toBe(false);
    expect(prisma.serviceRate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false, defaultRate: expect.anything() }),
      }),
    );
  });
});

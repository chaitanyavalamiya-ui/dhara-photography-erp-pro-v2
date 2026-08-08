import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthService', () => {
  let service: HealthService;

  const mockPrisma = {
    isConnected: jest.fn().mockReturnValue(true),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should return ok when database is connected', async () => {
    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.service).toBe('dhara-photography-erp-api');
  });

  it('should return degraded when database is disconnected', async () => {
    mockPrisma.isConnected.mockReturnValueOnce(false);
    const result = await service.check();
    expect(result.status).toBe('degraded');
    expect(result.database).toBe('disconnected');
  });
});

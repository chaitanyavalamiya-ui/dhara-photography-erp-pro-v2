import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponseDto> {
    let database: 'connected' | 'disconnected' = 'disconnected';

    if (this.prisma.isConnected()) {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        database = 'connected';
      } catch {
        database = 'disconnected';
      }
    }

    return {
      status: database === 'connected' ? 'ok' : 'degraded',
      service: 'dhara-photography-erp-api',
      version: '0.1.0',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SettingsServiceRateDto } from './dto/service-rate-response.dto';
import { UpdateServiceRateDto } from './dto/update-service-rate.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getServiceRates(companyId: string): Promise<SettingsServiceRateDto[]> {
    const rates = await this.prisma.serviceRate.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return rates.map((rate) => this.mapRate(rate));
  }

  async updateServiceRate(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateServiceRateDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SettingsServiceRateDto> {
    const existing = await this.prisma.serviceRate.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException('Service rate not found.');
    }

    const updated = await this.prisma.serviceRate.update({
      where: { id },
      data: {
        defaultRate: new Prisma.Decimal(dto.defaultRate),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'settings',
      action: 'update_service_rate',
      recordType: 'service_rate',
      recordId: updated.id,
      previousValue: {
        code: existing.code,
        name: existing.name,
        defaultRate: Number(existing.defaultRate),
        isActive: existing.isActive,
      },
      newValue: {
        code: updated.code,
        name: updated.name,
        defaultRate: Number(updated.defaultRate),
        isActive: updated.isActive,
      },
      ipAddress,
      userAgent,
    });

    return this.mapRate(updated);
  }

  private mapRate(rate: {
    id: string;
    code: string;
    name: string;
    category: string;
    defaultRate: Prisma.Decimal;
    unit: string;
    sortOrder: number;
    isActive: boolean;
    updatedAt: Date;
  }): SettingsServiceRateDto {
    return {
      id: rate.id,
      code: rate.code,
      name: rate.name,
      category: rate.category,
      defaultRate: Number(rate.defaultRate),
      unit: rate.unit,
      sortOrder: rate.sortOrder,
      isActive: rate.isActive,
      updatedAt: rate.updatedAt.toISOString(),
    };
  }
}

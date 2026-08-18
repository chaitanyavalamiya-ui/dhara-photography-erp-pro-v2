import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMasterDataDto } from './dto/create-master-data.dto';
import { CompanyProfileDto, UpdateCompanyProfileDto } from './dto/company-profile.dto';
import { MasterDataItemDto } from './dto/master-data-response.dto';
import { CreatePackageDto, PackageResponseDto, UpdatePackageDto } from './dto/package.dto';
import { SettingsServiceRateDto } from './dto/service-rate-response.dto';
import { UpdateMasterDataDto } from './dto/update-master-data.dto';
import { UpdateServiceRateDto } from './dto/update-service-rate.dto';
import { EQUIPMENT_MASTER_CATEGORY } from '../equipment/utils/equipment.utils';
import {
  buildPackageMetadata,
  PACKAGE_MASTER_CATEGORY,
  PackageMetadata,
  parsePackageMetadata,
} from './utils/package.utils';

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

  async getCompanyProfile(companyId: string): Promise<CompanyProfileDto> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    return {
      id: company.id,
      name: company.name,
      code: company.code,
      isActive: company.isActive,
    };
  }

  async updateCompanyProfile(
    companyId: string,
    userId: string,
    dto: UpdateCompanyProfileDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CompanyProfileDto> {
    const existing = await this.prisma.company.findFirst({
      where: { id: companyId },
    });

    if (!existing) {
      throw new NotFoundException('Company not found.');
    }

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        name: dto.name.trim(),
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'settings',
      action: 'update_company_profile',
      recordType: 'company',
      recordId: updated.id,
      previousValue: { name: existing.name },
      newValue: { name: updated.name },
      ipAddress,
      userAgent,
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      isActive: updated.isActive,
    };
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

  async getMasterData(
    companyId: string,
    category: string,
    includeInactive = false,
  ): Promise<MasterDataItemDto[]> {
    const items = await this.prisma.masterData.findMany({
      where: {
        companyId,
        category,
        archivedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    return items.map((item) => this.mapMasterData(item));
  }

  async createMasterData(
    companyId: string,
    userId: string,
    dto: CreateMasterDataDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<MasterDataItemDto> {
    const existing = await this.prisma.masterData.findFirst({
      where: {
        companyId,
        category: dto.category,
        code: dto.code,
      },
    });

    if (existing) {
      throw new ConflictException('An item with this code already exists.');
    }

    await this.assertUniqueEquipmentCategoryLabel(companyId, dto.category, dto.label);

    const created = await this.prisma.masterData.create({
      data: {
        companyId,
        category: dto.category,
        code: dto.code,
        label: dto.label.trim(),
        sortOrder: dto.sortOrder ?? 0,
        createdById: userId,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'settings',
      action: 'create_master_data',
      recordType: 'master_data',
      recordId: created.id,
      newValue: {
        category: created.category,
        code: created.code,
        label: created.label,
      },
      ipAddress,
      userAgent,
    });

    return this.mapMasterData(created);
  }

  async updateMasterData(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateMasterDataDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<MasterDataItemDto> {
    const existing = await this.prisma.masterData.findFirst({
      where: { id, companyId, archivedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Master data item not found.');
    }

    const previousLabel = existing.label;
    const previousCode = existing.code;

    if (dto.label !== undefined) {
      await this.assertUniqueEquipmentCategoryLabel(
        companyId,
        existing.category,
        dto.label,
        existing.id,
      );
    }

    if (dto.isActive === false && existing.isActive) {
      const inUse = await this.isMasterDataInUse(existing.id, existing.category);
      if (inUse) {
        throw new BadRequestException(
          'Cannot deactivate this item because it is referenced by existing records.',
        );
      }
    }

    const updated = await this.prisma.masterData.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedById: userId,
      },
    });

    if (
      existing.category === EQUIPMENT_MASTER_CATEGORY &&
      dto.label !== undefined &&
      dto.label.trim() !== previousLabel
    ) {
      await this.prisma.equipment.updateMany({
        where: {
          companyId,
          category: { in: [previousLabel, previousCode] },
        },
        data: { category: updated.label },
      });
    }

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'settings',
      action: 'update_master_data',
      recordType: 'master_data',
      recordId: updated.id,
      previousValue: {
        label: existing.label,
        sortOrder: existing.sortOrder,
        isActive: existing.isActive,
      },
      newValue: {
        label: updated.label,
        sortOrder: updated.sortOrder,
        isActive: updated.isActive,
      },
      ipAddress,
      userAgent,
    });

    return this.mapMasterData(updated);
  }

  private async isMasterDataInUse(id: string, category: string): Promise<boolean> {
    if (category === 'expense_category') {
      const count = await this.prisma.expense.count({
        where: { categoryId: id, archivedAt: null },
      });
      return count > 0;
    }

    if (category === 'payment_mode') {
      const [paymentCount, expenseCount] = await Promise.all([
        this.prisma.payment.count({ where: { paymentModeId: id, archivedAt: null } }),
        this.prisma.expense.count({ where: { paymentModeId: id, archivedAt: null } }),
      ]);
      return paymentCount + expenseCount > 0;
    }

    return false;
  }

  private async assertUniqueEquipmentCategoryLabel(
    companyId: string,
    category: string,
    label: string,
    excludeId?: string,
  ): Promise<void> {
    if (category !== EQUIPMENT_MASTER_CATEGORY) {
      return;
    }
    const duplicate = await this.prisma.masterData.findFirst({
      where: {
        companyId,
        category: EQUIPMENT_MASTER_CATEGORY,
        archivedAt: null,
        label: { equals: label.trim(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (duplicate) {
      throw new ConflictException('An equipment category with this name already exists.');
    }
  }

  async getPackages(companyId: string, includeInactive = false): Promise<PackageResponseDto[]> {
    const packages = await this.prisma.masterData.findMany({
      where: {
        companyId,
        category: PACKAGE_MASTER_CATEGORY,
        archivedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    return packages
      .map((entry) => this.mapPackage(entry))
      .filter((entry): entry is PackageResponseDto => entry !== null);
  }

  async createPackage(
    companyId: string,
    userId: string,
    dto: CreatePackageDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PackageResponseDto> {
    const existing = await this.prisma.masterData.findFirst({
      where: { companyId, category: PACKAGE_MASTER_CATEGORY, code: dto.code },
    });

    if (existing) {
      throw new ConflictException('A package with this code already exists.');
    }

    const serviceRates = await this.validatePackageItems(companyId, dto.items);
    const metadata = buildPackageMetadata(
      dto.description,
      dto.defaultPrice,
      dto.offerPrice,
      dto.items,
      serviceRates,
    );

    const created = await this.prisma.masterData.create({
      data: {
        companyId,
        category: PACKAGE_MASTER_CATEGORY,
        code: dto.code,
        label: dto.label.trim(),
        sortOrder: dto.sortOrder ?? 0,
        metadata: metadata as unknown as Prisma.InputJsonValue,
        createdById: userId,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'settings',
      action: 'create_package',
      recordType: 'package',
      recordId: created.id,
      newValue: { code: created.code, label: created.label },
      ipAddress,
      userAgent,
    });

    return this.mapPackage(created)!;
  }

  async updatePackage(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdatePackageDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PackageResponseDto> {
    const existing = await this.prisma.masterData.findFirst({
      where: { id, companyId, category: PACKAGE_MASTER_CATEGORY, archivedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Package not found.');
    }

    const currentMetadata = parsePackageMetadata(existing.metadata);
    if (!currentMetadata) {
      throw new BadRequestException('Package metadata is invalid.');
    }

    let metadata: PackageMetadata = currentMetadata;
    if (dto.items) {
      const serviceRates = await this.validatePackageItems(companyId, dto.items);
      metadata = buildPackageMetadata(
        dto.description ?? currentMetadata.description,
        dto.defaultPrice ?? currentMetadata.defaultPrice,
        dto.offerPrice ?? currentMetadata.offerPrice ?? undefined,
        dto.items,
        serviceRates,
      );
    } else if (
      dto.description !== undefined ||
      dto.defaultPrice !== undefined ||
      dto.offerPrice !== undefined
    ) {
      metadata = {
        ...currentMetadata,
        ...(dto.description !== undefined ? { description: dto.description.trim() || undefined } : {}),
        ...(dto.defaultPrice !== undefined ? { defaultPrice: dto.defaultPrice } : {}),
        ...(dto.offerPrice !== undefined ? { offerPrice: dto.offerPrice } : {}),
      };
    }

    const updated = await this.prisma.masterData.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        metadata: metadata as unknown as Prisma.InputJsonValue,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'settings',
      action: 'update_package',
      recordType: 'package',
      recordId: updated.id,
      previousValue: { label: existing.label, isActive: existing.isActive },
      newValue: { label: updated.label, isActive: updated.isActive },
      ipAddress,
      userAgent,
    });

    return this.mapPackage(updated)!;
  }

  private async validatePackageItems(
    companyId: string,
    items: CreatePackageDto['items'],
  ): Promise<Array<{ id: string; name: string; unit: string }>> {
    const ids = items.map((item) => item.serviceRateId);
    const serviceRates = await this.prisma.serviceRate.findMany({
      where: { companyId, id: { in: ids }, isActive: true },
    });

    if (serviceRates.length !== ids.length) {
      throw new BadRequestException('One or more included services are invalid.');
    }

    return serviceRates.map((rate) => ({
      id: rate.id,
      name: rate.name,
      unit: rate.unit,
    }));
  }

  private mapPackage(entry: {
    id: string;
    code: string;
    label: string;
    sortOrder: number;
    isActive: boolean;
    metadata: Prisma.JsonValue | null;
    updatedAt: Date;
  }): PackageResponseDto | null {
    const metadata = parsePackageMetadata(entry.metadata);
    if (!metadata) {
      return null;
    }

    return {
      id: entry.id,
      code: entry.code,
      label: entry.label,
      description: metadata.description ?? null,
      defaultPrice: metadata.defaultPrice,
      offerPrice: metadata.offerPrice ?? null,
      sortOrder: entry.sortOrder,
      isActive: entry.isActive,
      items: metadata.items.map((item) => ({
        serviceRateId: item.serviceRateId,
        serviceName: item.serviceName ?? 'Service',
        unit: item.unit ?? 'piece',
        quantity: item.quantity ?? 1,
        days: item.days ?? 1,
      })),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  private mapMasterData(item: {
    id: string;
    category: string;
    code: string;
    label: string;
    sortOrder: number;
    isActive: boolean;
    updatedAt: Date;
  }): MasterDataItemDto {
    return {
      id: item.id,
      category: item.category,
      code: item.code,
      label: item.label,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      updatedAt: item.updatedAt.toISOString(),
    };
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

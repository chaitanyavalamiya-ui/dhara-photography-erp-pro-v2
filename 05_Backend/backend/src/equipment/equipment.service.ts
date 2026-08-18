import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import {
  CreateEquipmentCategoryDto,
  CreateEquipmentDto,
  CreateEquipmentIssueDto,
  CreateEquipmentReturnDto,
  ListEquipmentQueryDto,
  ListIssuesQueryDto,
  UpdateEquipmentCategoryDto,
  UpdateEquipmentDto,
} from './dto/equipment.dto';
import {
  BookingEquipmentOverviewDto,
  EquipmentDashboardDto,
  EquipmentDetailResponseDto,
  EquipmentIssueResponseDto,
  EquipmentResponseDto,
  PaginatedEquipmentResponseDto,
  StaffEquipmentSummaryDto,
} from './dto/equipment-response.dto';
import {
  allocateNextIssueNumber,
  computeIssueStatus,
  computeItemReturnStatus,
  deriveEquipmentStatus,
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_MASTER_CATEGORY,
  isSerializedUnavailable,
  slugifyEquipmentCategory,
} from './utils/equipment.utils';
import {
  parseEquipmentSpecifications,
  sanitizeEquipmentSpecifications,
} from './utils/equipment-specifications';

const ACTIVE = { archivedAt: null, isActive: true } as const;

const issueInclude = {
  booking: { select: { id: true, bookingNumber: true, eventType: true, eventDate: true, client: { select: { fullName: true } } } },
  staff: { select: { id: true, fullName: true, staffCode: true } },
  items: {
    include: {
      equipment: {
        select: { id: true, name: true, code: true, category: true, serialNumber: true, trackingType: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.EquipmentIssueInclude;

type IssueWithRelations = Prisma.EquipmentIssueGetPayload<{ include: typeof issueInclude }>;

@Injectable()
export class EquipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly settingsService: SettingsService,
  ) {}

  async findAll(
    companyId: string,
    query: ListEquipmentQueryDto,
  ): Promise<PaginatedEquipmentResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where: Prisma.EquipmentWhereInput = { companyId, ...ACTIVE };

    if (query.category) {
      const match = await this.findCategory(companyId, query.category, true);
      where.category = match
        ? { in: [match.label, match.code] }
        : query.category;
    }
    if (query.status) where.status = query.status;
    if (query.trackingType) where.trackingType = query.trackingType;
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
        { serialNumber: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.equipment.findMany({
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.equipment.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.mapEquipment(row)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(companyId: string, id: string): Promise<EquipmentDetailResponseDto> {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id, companyId, ...ACTIVE },
      include: {
        history: {
          orderBy: { occurredAt: 'desc' },
          take: 50,
          include: {
            booking: { select: { bookingNumber: true } },
            staff: { select: { fullName: true } },
          },
        },
      },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found.');
    }

    return {
      ...this.mapEquipment(equipment),
      history: equipment.history.map((row) => ({
        id: row.id,
        action: row.action,
        quantity: row.quantity,
        conditionOut: row.conditionOut,
        conditionIn: row.conditionIn,
        bookingNumber: row.booking?.bookingNumber ?? null,
        staffName: row.staff?.fullName ?? null,
        notes: row.notes,
        occurredAt: row.occurredAt.toISOString(),
      })),
    };
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateEquipmentDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<EquipmentResponseDto> {
    const trackingType = dto.trackingType ?? 'bulk';
    const totalQuantity = trackingType === 'serialized' ? 1 : (dto.totalQuantity ?? 1);
    const serialNumber = dto.serialNumber?.trim() || null;

    if (trackingType === 'serialized' && !serialNumber) {
      throw new BadRequestException('Serialized equipment requires a serial / item ID.');
    }

    const category = await this.resolveCategory(companyId, dto.category, false);
    const specifications = this.resolveSpecifications(dto.specifications, category.code, category.label);
    const code = dto.code.trim().toUpperCase();
    await this.assertUniqueCode(companyId, code);
    await this.assertUniqueSerial(companyId, serialNumber);

    try {
      const created = await this.prisma.equipment.create({
        data: {
          companyId,
          code,
          name: dto.name.trim(),
          category: category.label,
          trackingType,
          serialNumber,
          totalQuantity,
          availableQuantity: totalQuantity,
          onShootQuantity: 0,
          missingQuantity: 0,
          underRepairQuantity: 0,
          status: 'AVAILABLE',
          condition: dto.condition ?? 'GOOD',
          notes: dto.notes?.trim() || null,
          specifications: specifications ?? Prisma.DbNull,
          createdById: userId,
          updatedById: userId,
        },
      });

      await this.auditService.log({
        companyId,
        actorUserId: userId,
        module: 'equipment',
        action: 'created',
        recordType: 'equipment',
        recordId: created.id,
        newValue: { code: created.code, name: created.name },
        ipAddress,
        userAgent,
      });

      return this.mapEquipment(created);
    } catch (error) {
      this.rethrowUniqueConstraint(error);
    }
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateEquipmentDto,
  ): Promise<EquipmentResponseDto> {
    const existing = await this.getEquipmentOrThrow(companyId, id);

    if (existing.trackingType === 'serialized' && dto.serialNumber !== undefined && !dto.serialNumber.trim()) {
      throw new BadRequestException('Serialized equipment requires a serial / item ID.');
    }

    let totalQuantity = dto.totalQuantity ?? existing.totalQuantity;
    if (existing.trackingType === 'serialized') {
      totalQuantity = 1;
    }

    const committed =
      existing.onShootQuantity + existing.missingQuantity + existing.underRepairQuantity;
    if (totalQuantity < committed) {
      throw new BadRequestException(
        'Total quantity cannot be less than items currently on shoot, missing, or under repair.',
      );
    }

    const category =
      dto.category !== undefined
        ? await this.resolveCategory(companyId, dto.category, false)
        : null;
    const code = dto.code !== undefined ? dto.code.trim().toUpperCase() : existing.code;
    const serialNumber =
      dto.serialNumber !== undefined ? dto.serialNumber.trim() || null : existing.serialNumber;

    await this.assertUniqueCode(companyId, code, existing.id);
    await this.assertUniqueSerial(companyId, serialNumber, existing.id);

    const availableQuantity = totalQuantity - committed;
    const nextCategoryLabel = category?.label ?? existing.category;
    const nextCategoryCode = category?.code;
    const specifications =
      dto.specifications !== undefined
        ? this.resolveSpecifications(
            dto.specifications,
            nextCategoryCode,
            nextCategoryLabel,
            existing.category,
          )
        : undefined;
    try {
      const updated = await this.prisma.equipment.update({
        where: { id },
        data: {
          name: dto.name?.trim() || existing.name,
          code,
          category: nextCategoryLabel,
          serialNumber,
          totalQuantity,
          availableQuantity,
          condition: dto.condition ?? existing.condition,
          notes: dto.notes !== undefined ? dto.notes.trim() || null : existing.notes,
          ...(specifications !== undefined
            ? { specifications: specifications ?? Prisma.DbNull }
            : {}),
          status: deriveEquipmentStatus({
            trackingType: existing.trackingType,
            availableQuantity,
            onShootQuantity: existing.onShootQuantity,
            missingQuantity: existing.missingQuantity,
            underRepairQuantity: existing.underRepairQuantity,
          }),
          updatedById: userId,
        },
      });
      return this.mapEquipment(updated);
    } catch (error) {
      this.rethrowUniqueConstraint(error);
    }
  }

  async archive(companyId: string, userId: string, id: string): Promise<{ message: string }> {
    const existing = await this.getEquipmentOrThrow(companyId, id);
    if (existing.onShootQuantity > 0) {
      throw new BadRequestException('Cannot archive equipment that is currently on shoot.');
    }

    await this.prisma.equipment.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: userId,
        updatedById: userId,
      },
    });

    return { message: 'Equipment archived successfully.' };
  }

  async listCategories(companyId: string, includeInactive = false) {
    return this.settingsService.getMasterData(companyId, EQUIPMENT_MASTER_CATEGORY, includeInactive);
  }

  async createCategory(
    companyId: string,
    userId: string,
    dto: CreateEquipmentCategoryDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const code = (dto.code?.trim() || slugifyEquipmentCategory(dto.label)).toLowerCase();
    return this.settingsService.createMasterData(
      companyId,
      userId,
      {
        category: EQUIPMENT_MASTER_CATEGORY,
        code,
        label: dto.label.trim(),
        sortOrder: dto.sortOrder,
      },
      ipAddress,
      userAgent,
    );
  }

  async updateCategory(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateEquipmentCategoryDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.masterData.findFirst({
      where: { id, companyId, category: EQUIPMENT_MASTER_CATEGORY, archivedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Equipment category not found.');
    }
    return this.settingsService.updateMasterData(companyId, userId, id, dto, ipAddress, userAgent);
  }

  async getDashboard(companyId: string): Promise<EquipmentDashboardDto> {
    const [agg, openIssues] = await Promise.all([
      this.prisma.equipment.aggregate({
        where: { companyId, ...ACTIVE },
        _sum: {
          availableQuantity: true,
          onShootQuantity: true,
          missingQuantity: true,
          underRepairQuantity: true,
        },
      }),
      this.prisma.equipmentIssue.findMany({
        where: { companyId, ...ACTIVE, status: { in: ['OPEN', 'PARTIAL'] } },
        select: { staffId: true, items: { select: { quantityIssued: true, quantityReturned: true, missingQuantity: true } } },
      }),
    ]);

    const holding = openIssues.reduce((sum, issue) => {
      const outstanding = issue.items.reduce(
        (itemSum, item) =>
          itemSum + (item.quantityIssued - item.quantityReturned - item.missingQuantity),
        0,
      );
      return sum + outstanding;
    }, 0);

    return {
      onShoot: agg._sum.onShootQuantity ?? 0,
      withStaff: holding,
      missing: agg._sum.missingQuantity ?? 0,
      damaged: agg._sum.underRepairQuantity ?? 0,
      underRepair: agg._sum.underRepairQuantity ?? 0,
      available: agg._sum.availableQuantity ?? 0,
    };
  }

  async createIssue(
    companyId: string,
    userId: string,
    dto: CreateEquipmentIssueDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<EquipmentIssueResponseDto> {
    await this.assertBooking(companyId, dto.bookingId);
    await this.assertStaff(companyId, dto.staffId);

    for (const item of dto.items) {
      if (!EQUIPMENT_CONDITIONS.includes(item.conditionOut as never)) {
        throw new BadRequestException('Invalid condition out.');
      }
    }

    const issue = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.equipmentIssue.findFirst({
        where: { companyId },
        orderBy: { issueNumber: 'desc' },
        select: { issueNumber: true },
      });

      const created = await tx.equipmentIssue.create({
        data: {
          companyId,
          bookingId: dto.bookingId,
          staffId: dto.staffId,
          issueNumber: allocateNextIssueNumber(latest?.issueNumber),
          issuedAt: new Date(),
          status: 'OPEN',
          notes: dto.notes?.trim() || null,
          createdById: userId,
          updatedById: userId,
        },
      });

      for (const line of dto.items) {
        await this.issueLine(tx, companyId, userId, created, line);
      }

      return tx.equipmentIssue.findFirstOrThrow({
        where: { id: created.id },
        include: issueInclude,
      });
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'equipment',
      action: 'issued',
      recordType: 'equipment_issue',
      recordId: issue.id,
      newValue: { issueNumber: issue.issueNumber, bookingId: dto.bookingId, staffId: dto.staffId },
      ipAddress,
      userAgent,
    });

    return this.mapIssue(issue);
  }

  async listIssues(companyId: string, query: ListIssuesQueryDto): Promise<EquipmentIssueResponseDto[]> {
    const where: Prisma.EquipmentIssueWhereInput = { companyId, ...ACTIVE };
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.staffId) where.staffId = query.staffId;
    if (query.status) where.status = query.status;

    const issues = await this.prisma.equipmentIssue.findMany({
      where,
      include: issueInclude,
      orderBy: { issuedAt: 'desc' },
    });

    return issues.map((issue) => this.mapIssue(issue));
  }

  async getIssue(companyId: string, issueId: string): Promise<EquipmentIssueResponseDto> {
    const issue = await this.prisma.equipmentIssue.findFirst({
      where: { id: issueId, companyId, ...ACTIVE },
      include: issueInclude,
    });
    if (!issue) {
      throw new NotFoundException('Equipment issue not found.');
    }
    return this.mapIssue(issue);
  }

  async returnIssue(
    companyId: string,
    userId: string,
    issueId: string,
    dto: CreateEquipmentReturnDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<EquipmentIssueResponseDto> {
    const issue = await this.prisma.equipmentIssue.findFirst({
      where: { id: issueId, companyId, ...ACTIVE },
      include: { items: true },
    });
    if (!issue) {
      throw new NotFoundException('Equipment issue not found.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const returnedAt = new Date();
      const returnRecord = await tx.equipmentReturn.create({
        data: {
          companyId,
          issueId,
          returnedAt,
          status: 'PARTIAL',
          notes: dto.notes?.trim() || null,
          createdById: userId,
        },
      });

      for (const line of dto.items) {
        await this.returnLine(tx, companyId, userId, issue, returnRecord.id, line, returnedAt);
      }

      const refreshedItems = await tx.equipmentIssueItem.findMany({ where: { issueId } });
      const status = computeIssueStatus(refreshedItems);

      await tx.equipmentReturn.update({
        where: { id: returnRecord.id },
        data: { status },
      });
      await tx.equipmentIssue.update({
        where: { id: issueId },
        data: { status, updatedById: userId },
      });

      return tx.equipmentIssue.findFirstOrThrow({
        where: { id: issueId },
        include: issueInclude,
      });
    });

    const summary = this.summarizeItems(updated.items);
    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'equipment',
      action: summary.totalMissing > 0 ? 'missing' : summary.totalDamaged > 0 ? 'damaged' : 'returned',
      recordType: 'equipment_issue',
      recordId: issueId,
      newValue: summary,
      ipAddress,
      userAgent,
    });

    return this.mapIssue(updated);
  }

  async getBookingOverview(companyId: string, bookingId: string): Promise<BookingEquipmentOverviewDto> {
    await this.assertBooking(companyId, bookingId);
    const issues = await this.listIssues(companyId, { bookingId });
    const usedMap = new Map<string, { category: string; name: string; quantity: number }>();
    const summary = { totalIssued: 0, totalReturned: 0, totalMissing: 0, totalDamaged: 0 };

    for (const issue of issues) {
      summary.totalIssued += issue.summary.totalIssued;
      summary.totalReturned += issue.summary.totalReturned;
      summary.totalMissing += issue.summary.totalMissing;
      summary.totalDamaged += issue.summary.totalDamaged;
      for (const item of issue.items) {
        const key = `${item.category}:${item.equipmentName}`;
        const existing = usedMap.get(key) ?? {
          category: item.category,
          name: item.equipmentName,
          quantity: 0,
        };
        existing.quantity += item.quantityIssued;
        usedMap.set(key, existing);
      }
    }

    return {
      used: Array.from(usedMap.values()),
      summary,
      issues,
    };
  }

  async getStaffSummary(companyId: string, staffId: string): Promise<StaffEquipmentSummaryDto> {
    const staff = await this.assertStaff(companyId, staffId);
    const issues = await this.listIssues(companyId, { staffId });
    const currentlyHolding = issues.reduce((sum, issue) => {
      return (
        sum +
        issue.items.reduce(
          (itemSum, item) =>
            itemSum + (item.quantityIssued - item.quantityReturned - item.missingQuantity),
          0,
        )
      );
    }, 0);

    return {
      staffId: staff.id,
      staffName: staff.fullName,
      totalIssues: issues.length,
      currentlyHolding,
      returned: issues.reduce((sum, issue) => sum + issue.summary.totalReturned, 0),
      missing: issues.reduce((sum, issue) => sum + issue.summary.totalMissing, 0),
      damaged: issues.reduce((sum, issue) => sum + issue.summary.totalDamaged, 0),
      issues,
    };
  }

  private async issueLine(
    tx: Prisma.TransactionClient,
    companyId: string,
    userId: string,
    issue: { id: string; bookingId: string; staffId: string },
    line: { equipmentId: string; quantityIssued: number; conditionOut: string; notes?: string },
  ) {
    const equipment = await tx.equipment.findFirst({
      where: { id: line.equipmentId, companyId, ...ACTIVE },
    });
    if (!equipment) {
      throw new NotFoundException('Equipment not found.');
    }

    if (equipment.trackingType === 'serialized') {
      if (line.quantityIssued !== 1) {
        throw new BadRequestException(`${equipment.name} is serialized and can only be issued as quantity 1.`);
      }
      if (isSerializedUnavailable(equipment.status)) {
        throw new BadRequestException(
          `${equipment.name} (${equipment.serialNumber ?? equipment.code}) is ${equipment.status} and cannot be issued.`,
        );
      }
      const locked = await tx.equipment.updateMany({
        where: { id: equipment.id, companyId, status: 'AVAILABLE', availableQuantity: { gte: 1 } },
        data: {
          availableQuantity: 0,
          onShootQuantity: 1,
          status: 'ON_SHOOT',
          updatedById: userId,
        },
      });
      if (locked.count !== 1) {
        throw new BadRequestException(
          `${equipment.name} is already on shoot or unavailable.`,
        );
      }
    } else {
      const locked = await tx.equipment.updateMany({
        where: {
          id: equipment.id,
          companyId,
          availableQuantity: { gte: line.quantityIssued },
        },
        data: {
          availableQuantity: { decrement: line.quantityIssued },
          onShootQuantity: { increment: line.quantityIssued },
          status: 'ON_SHOOT',
          updatedById: userId,
        },
      });
      if (locked.count !== 1) {
        throw new BadRequestException(
          `Cannot issue ${line.quantityIssued} of ${equipment.name}. Available: ${equipment.availableQuantity}.`,
        );
      }
      const after = await tx.equipment.findFirstOrThrow({ where: { id: equipment.id } });
      await tx.equipment.update({
        where: { id: equipment.id },
        data: {
          status: deriveEquipmentStatus(after),
        },
      });
    }

    await tx.equipmentIssueItem.create({
      data: {
        issueId: issue.id,
        equipmentId: equipment.id,
        quantityIssued: line.quantityIssued,
        serialNumber: equipment.serialNumber,
        conditionOut: line.conditionOut,
        notes: line.notes?.trim() || null,
      },
    });

    await tx.equipmentHistory.create({
      data: {
        companyId,
        equipmentId: equipment.id,
        issueId: issue.id,
        bookingId: issue.bookingId,
        staffId: issue.staffId,
        action: 'ISSUED',
        quantity: line.quantityIssued,
        conditionOut: line.conditionOut,
        notes: line.notes?.trim() || null,
        createdById: userId,
      },
    });
  }

  private async returnLine(
    tx: Prisma.TransactionClient,
    companyId: string,
    userId: string,
    issue: { id: string; bookingId: string; staffId: string; items: Array<{
      id: string;
      equipmentId: string;
      quantityIssued: number;
      quantityReturned: number;
      missingQuantity: number;
      damagedQuantity: number;
    }> },
    returnId: string,
    line: { issueItemId: string; quantityReturned: number; conditionIn: string; notes?: string },
    returnedAt: Date,
  ) {
    const existing = issue.items.find((item) => item.id === line.issueItemId);
    if (!existing) {
      throw new NotFoundException('Issue item not found on this checklist.');
    }

    const outstanding = existing.quantityIssued - existing.quantityReturned - existing.missingQuantity;
    if (line.quantityReturned < 0) {
      throw new BadRequestException('Returned quantity cannot be negative.');
    }
    if (line.quantityReturned > outstanding) {
      throw new BadRequestException('Returned quantity cannot exceed issued quantity.');
    }

    const missingQuantity = outstanding - line.quantityReturned;
    const damagedQuantity = line.conditionIn === 'DAMAGED' ? line.quantityReturned : 0;
    const nextReturned = existing.quantityReturned + line.quantityReturned;
    const nextMissing = existing.missingQuantity + missingQuantity;
    const nextDamaged = existing.damagedQuantity + damagedQuantity;
    const returnStatus = computeItemReturnStatus({
      quantityIssued: existing.quantityIssued,
      quantityReturned: nextReturned,
      missingQuantity: nextMissing,
      damagedQuantity: nextDamaged,
    });

    await tx.equipmentIssueItem.update({
      where: { id: existing.id },
      data: {
        quantityReturned: nextReturned,
        missingQuantity: nextMissing,
        damagedQuantity: nextDamaged,
        conditionIn: line.conditionIn,
        returnStatus,
        notes: line.notes !== undefined ? line.notes.trim() || null : undefined,
      },
    });

    await tx.equipmentReturnItem.create({
      data: {
        returnId,
        issueItemId: existing.id,
        quantityReturned: line.quantityReturned,
        missingQuantity,
        damagedQuantity,
        conditionIn: line.conditionIn,
        returnStatus,
        notes: line.notes?.trim() || null,
      },
    });

    const equipment = await tx.equipment.findFirstOrThrow({
      where: { id: existing.equipmentId, companyId },
    });

    const goodReturned = line.quantityReturned - damagedQuantity;
    const nextAvailable = equipment.availableQuantity + goodReturned;
    const nextOnShoot = equipment.onShootQuantity - line.quantityReturned - missingQuantity;
    const nextMissingQty = equipment.missingQuantity + missingQuantity;
    const nextRepair = equipment.underRepairQuantity + damagedQuantity;
    const nextStatus = deriveEquipmentStatus({
      trackingType: equipment.trackingType,
      availableQuantity: nextAvailable,
      onShootQuantity: Math.max(nextOnShoot, 0),
      missingQuantity: nextMissingQty,
      underRepairQuantity: nextRepair,
    });

    await tx.equipment.update({
      where: { id: equipment.id },
      data: {
        availableQuantity: nextAvailable,
        onShootQuantity: Math.max(nextOnShoot, 0),
        missingQuantity: nextMissingQty,
        underRepairQuantity: nextRepair,
        status: nextStatus,
        condition: damagedQuantity > 0 ? 'DAMAGED' : equipment.condition,
        updatedById: userId,
      },
    });

    const historyAction =
      missingQuantity > 0 ? 'MISSING' : damagedQuantity > 0 ? 'DAMAGED' : 'RETURNED';

    await tx.equipmentHistory.create({
      data: {
        companyId,
        equipmentId: equipment.id,
        issueId: issue.id,
        returnId,
        bookingId: issue.bookingId,
        staffId: issue.staffId,
        action: historyAction,
        quantity: line.quantityReturned + missingQuantity,
        conditionOut: null,
        conditionIn: line.conditionIn,
        notes:
          missingQuantity > 0
            ? `RETURNED: ${line.quantityReturned > 0 ? 'PARTIAL' : 'NO'}. Status: MISSING. ${line.notes ?? ''}`.trim()
            : line.notes?.trim() || null,
        occurredAt: returnedAt,
        createdById: userId,
      },
    });
  }

  private async getEquipmentOrThrow(companyId: string, id: string) {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id, companyId, ...ACTIVE },
    });
    if (!equipment) {
      throw new NotFoundException('Equipment not found.');
    }
    return equipment;
  }

  private async findCategory(companyId: string, value: string, includeInactive: boolean) {
    const term = value.trim();
    return this.prisma.masterData.findFirst({
      where: {
        companyId,
        category: EQUIPMENT_MASTER_CATEGORY,
        archivedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
        OR: [
          { code: { equals: term, mode: 'insensitive' } },
          { label: { equals: term, mode: 'insensitive' } },
        ],
      },
    });
  }

  private async resolveCategory(companyId: string, value: string, allowInactive: boolean) {
    const match = await this.findCategory(companyId, value, allowInactive);
    if (!match) {
      throw new BadRequestException('Invalid or inactive equipment category.');
    }
    if (!allowInactive && !match.isActive) {
      throw new BadRequestException('Invalid or inactive equipment category.');
    }
    return match;
  }

  private async assertUniqueCode(companyId: string, code: string, excludeId?: string) {
    const duplicate = await this.prisma.equipment.findFirst({
      where: {
        companyId,
        code,
        archivedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (duplicate) {
      throw new ConflictException('An equipment item with this code already exists.');
    }
  }

  private async assertUniqueSerial(companyId: string, serialNumber: string | null, excludeId?: string) {
    if (!serialNumber) {
      return;
    }
    const duplicate = await this.prisma.equipment.findFirst({
      where: {
        companyId,
        serialNumber,
        archivedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (duplicate) {
      throw new ConflictException('A serialized item with this serial / item ID already exists.');
    }
  }

  private rethrowUniqueConstraint(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('An equipment item with this code or serial already exists.');
    }
    throw error;
  }

  private resolveSpecifications(
    input: Record<string, unknown> | null | undefined,
    ...categoryValues: Array<string | null | undefined>
  ) {
    const result = sanitizeEquipmentSpecifications(input, ...categoryValues);
    if (result.error) {
      throw new BadRequestException(result.error);
    }
    return result.specs;
  }

  private async assertBooking(companyId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId, archivedAt: null },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }
    return booking;
  }

  private async assertStaff(companyId: string, staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, companyId, archivedAt: null },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found.');
    }
    return staff;
  }

  private mapEquipment(row: {
    id: string;
    code: string;
    name: string;
    category: string;
    trackingType: string;
    serialNumber: string | null;
    totalQuantity: number;
    availableQuantity: number;
    onShootQuantity: number;
    missingQuantity: number;
    underRepairQuantity: number;
    status: string;
    condition: string;
    notes: string | null;
    specifications?: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): EquipmentResponseDto {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      trackingType: row.trackingType,
      serialNumber: row.serialNumber,
      totalQuantity: row.totalQuantity,
      availableQuantity: row.availableQuantity,
      onShootQuantity: row.onShootQuantity,
      missingQuantity: row.missingQuantity,
      underRepairQuantity: row.underRepairQuantity,
      status: row.status,
      condition: row.condition,
      notes: row.notes,
      specifications: parseEquipmentSpecifications(row.specifications ?? null),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private summarizeItems(
    items: Array<{
      quantityIssued: number;
      quantityReturned: number;
      missingQuantity: number;
      damagedQuantity: number;
    }>,
  ) {
    return {
      totalIssued: items.reduce((sum, item) => sum + item.quantityIssued, 0),
      totalReturned: items.reduce((sum, item) => sum + item.quantityReturned, 0),
      totalMissing: items.reduce((sum, item) => sum + item.missingQuantity, 0),
      totalDamaged: items.reduce((sum, item) => sum + item.damagedQuantity, 0),
    };
  }

  private mapIssue(issue: IssueWithRelations): EquipmentIssueResponseDto {
    const items = issue.items.map((item) => ({
      id: item.id,
      equipmentId: item.equipmentId,
      equipmentName: item.equipment.name,
      equipmentCode: item.equipment.code,
      category: item.equipment.category,
      serialNumber: item.serialNumber ?? item.equipment.serialNumber,
      quantityIssued: item.quantityIssued,
      quantityReturned: item.quantityReturned,
      missingQuantity: item.missingQuantity,
      damagedQuantity: item.damagedQuantity,
      conditionOut: item.conditionOut,
      conditionIn: item.conditionIn,
      returnStatus: item.returnStatus,
      notes: item.notes,
    }));

    return {
      id: issue.id,
      issueNumber: issue.issueNumber,
      bookingId: issue.bookingId,
      bookingNumber: issue.booking.bookingNumber,
      clientName: issue.booking.client.fullName,
      eventType: issue.booking.eventType,
      eventDate: issue.booking.eventDate?.toISOString() ?? null,
      staffId: issue.staffId,
      staffName: issue.staff.fullName,
      issuedAt: issue.issuedAt.toISOString(),
      status: issue.status,
      notes: issue.notes,
      items,
      summary: this.summarizeItems(items),
    };
  }
}

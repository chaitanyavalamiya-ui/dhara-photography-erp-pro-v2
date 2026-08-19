import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import {
  ClientResponseDto,
  PaginatedClientsResponseDto,
  UpcomingClientEventDto,
} from './dto/client-response.dto';
import {
  normalizeEmail,
  normalizeIndianMobile,
  parseOptionalDate,
  toDateOnlyString,
  validateIndianMobile,
  allocateNextClientNumber,
  isClientNumberUniqueConflict,
  isClientMobileUniqueConflict,
} from './utils/client.utils';

type ClientWithRelations = Prisma.ClientGetPayload<{
  include: {
    status: true;
    bookings: { select: { totalAmount: true } };
    invoices: { select: { totalAmount: true; outstandingAmount: true } };
  };
}>;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    companyId: string,
    query: ListClientsQueryDto,
  ): Promise<PaginatedClientsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where = this.buildWhereClause(companyId, query.search, query.status);

    const computedSortFields = ['totalBookings', 'totalAmount', 'outstandingBalance'];

    if (computedSortFields.includes(sortBy)) {
      const clients = await this.prisma.client.findMany({
        where,
        include: this.clientInclude(),
      });

      const mapped = clients.map((client) => this.mapClient(client));
      mapped.sort((a, b) => this.compareClients(a, b, sortBy, sortOrder));

      const total = mapped.length;
      const start = (page - 1) * limit;
      const items = mapped.slice(start, start + limit);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    const orderBy = this.buildOrderBy(sortBy, sortOrder);
    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: this.clientInclude(),
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      items: clients.map((client) => this.mapClient(client)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(companyId: string, id: string): Promise<ClientResponseDto> {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
      include: this.clientInclude(),
    });

    if (!client) {
      throw new NotFoundException('Client not found.');
    }

    return this.mapClient(client);
  }

  async getUpcomingEvents(
    companyId: string,
    daysAhead = 30,
  ): Promise<UpcomingClientEventDto[]> {
    const clients = await this.prisma.client.findMany({
      where: {
        companyId,
        archivedAt: null,
        isActive: true,
        OR: [{ dateOfBirth: { not: null } }, { anniversaryDate: { not: null } }],
      },
      select: {
        id: true,
        fullName: true,
        mobile: true,
        dateOfBirth: true,
        anniversaryDate: true,
      },
    });

    const today = this.startOfDay(new Date());
    const events: UpcomingClientEventDto[] = [];

    for (const client of clients) {
      if (client.dateOfBirth) {
        const next = this.getNextOccurrence(client.dateOfBirth, today);
        const daysUntil = this.daysBetween(today, next);

        if (daysUntil <= daysAhead) {
          events.push({
            clientId: client.id,
            clientName: client.fullName,
            mobile: client.mobile,
            eventType: 'birthday',
            eventDate: toDateOnlyString(next) ?? '',
            daysUntil,
          });
        }
      }

      if (client.anniversaryDate) {
        const next = this.getNextOccurrence(client.anniversaryDate, today);
        const daysUntil = this.daysBetween(today, next);

        if (daysUntil <= daysAhead) {
          events.push({
            clientId: client.id,
            clientName: client.fullName,
            mobile: client.mobile,
            eventType: 'anniversary',
            eventDate: toDateOnlyString(next) ?? '',
            daysUntil,
          });
        }
      }
    }

    return events.sort((a, b) => a.daysUntil - b.daysUntil || a.clientName.localeCompare(b.clientName));
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateClientDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ClientResponseDto> {
    validateIndianMobile(dto.mobile);
    const normalizedMobile = normalizeIndianMobile(dto.mobile);

    if (dto.whatsapp) {
      validateIndianMobile(dto.whatsapp);
    }

    const normalizedWhatsapp = dto.whatsapp ? normalizeIndianMobile(dto.whatsapp) : null;
    const normalizedEmailValue = normalizeEmail(dto.email);

    await this.ensureUniqueContact(companyId, normalizedMobile, normalizedEmailValue);

    const branch = await this.prisma.companyBranch.findFirst({
      where: { companyId, isActive: true, archivedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    if (!branch) {
      throw new NotFoundException('No active branch found for this company.');
    }

    const activeStatus = await this.prisma.masterData.findFirst({
      where: {
        companyId,
        category: 'client_status',
        code: 'active',
        isActive: true,
      },
    });

    const maxAttempts = 5;
    let lastError: unknown;
    let client: ClientWithRelations | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        client = await this.prisma.$transaction(async (tx) => {
          const clientNumber = await this.generateClientNumber(companyId, tx);

          const created = await tx.client.create({
            data: {
              companyId,
              primaryBranchId: branch.id,
              clientNumber,
              fullName: dto.fullName.trim(),
              mobile: dto.mobile.trim(),
              normalizedMobile,
              email: dto.email?.trim() || null,
              normalizedEmail: normalizedEmailValue,
              whatsapp: dto.whatsapp?.trim() || null,
              normalizedWhatsapp,
              address: dto.address?.trim() || null,
              city: dto.city?.trim() || null,
              dateOfBirth: parseOptionalDate(dto.dateOfBirth),
              anniversaryDate: parseOptionalDate(dto.anniversaryDate),
              notes: dto.notes?.trim() || null,
              statusId: activeStatus?.id ?? null,
              createdById: userId,
              updatedById: userId,
            },
            include: this.clientInclude(),
          });

          await tx.clientBranch.create({
            data: {
              clientId: created.id,
              branchId: branch.id,
              isPrimary: true,
              createdById: userId,
              updatedById: userId,
            },
          });

          return created;
        });
        break;
      } catch (error) {
        lastError = error;
        if (isClientMobileUniqueConflict(error)) {
          throw new ConflictException(
            'A client with this mobile number already exists, including an archived client. Restore that client or choose another number.',
          );
        }
        if (!isClientNumberUniqueConflict(error) || attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }

    if (!client) {
      throw lastError instanceof Error ? lastError : new Error('Failed to create client.');
    }

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'clients',
      action: 'create',
      recordType: 'client',
      recordId: client.id,
      newValue: this.auditSnapshot(client),
      ipAddress,
      userAgent,
    });

    return this.mapClient(client);
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateClientDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ClientResponseDto> {
    const existing = await this.prisma.client.findFirst({
      where: { id, companyId, archivedAt: null },
      include: this.clientInclude(),
    });

    if (!existing) {
      throw new NotFoundException('Client not found.');
    }

    const normalizedMobile =
      dto.mobile !== undefined ? normalizeIndianMobile(dto.mobile) : existing.normalizedMobile;

    if (dto.mobile !== undefined) {
      validateIndianMobile(dto.mobile);
    }

    const normalizedWhatsapp =
      dto.whatsapp !== undefined
        ? dto.whatsapp
          ? normalizeIndianMobile(dto.whatsapp)
          : null
        : existing.normalizedWhatsapp;

    if (dto.whatsapp) {
      validateIndianMobile(dto.whatsapp);
    }

    const normalizedEmailValue =
      dto.email !== undefined ? normalizeEmail(dto.email) : existing.normalizedEmail;

    await this.ensureUniqueContact(companyId, normalizedMobile, normalizedEmailValue, id);

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        mobile: dto.mobile?.trim(),
        normalizedMobile,
        email: dto.email !== undefined ? dto.email?.trim() || null : undefined,
        normalizedEmail: normalizedEmailValue,
        whatsapp: dto.whatsapp !== undefined ? dto.whatsapp?.trim() || null : undefined,
        normalizedWhatsapp,
        address: dto.address !== undefined ? dto.address?.trim() || null : undefined,
        city: dto.city !== undefined ? dto.city?.trim() || null : undefined,
        dateOfBirth:
          dto.dateOfBirth !== undefined ? parseOptionalDate(dto.dateOfBirth) : undefined,
        anniversaryDate:
          dto.anniversaryDate !== undefined ? parseOptionalDate(dto.anniversaryDate) : undefined,
        notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
        updatedById: userId,
      },
      include: this.clientInclude(),
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'clients',
      action: 'update',
      recordType: 'client',
      recordId: updated.id,
      previousValue: this.auditSnapshot(existing),
      newValue: this.auditSnapshot(updated),
      ipAddress,
      userAgent,
    });

    return this.mapClient(updated);
  }

  async archive(
    companyId: string,
    userId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const existing = await this.prisma.client.findFirst({
      where: { id, companyId, archivedAt: null },
      include: this.clientInclude(),
    });

    if (!existing) {
      throw new NotFoundException('Client not found.');
    }

    const activeBookings = await this.prisma.booking.count({
      where: { companyId, clientId: id, archivedAt: null, isActive: true },
    });
    if (activeBookings > 0) {
      throw new BadRequestException(
        'Cannot archive a client who still has active bookings.',
      );
    }

    await this.prisma.client.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: userId,
        archivedReason: 'Archived from clients module',
        updatedById: userId,
      },
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'clients',
      action: 'archive',
      recordType: 'client',
      recordId: id,
      previousValue: this.auditSnapshot(existing),
      ipAddress,
      userAgent,
    });

    return { message: 'Client archived successfully.' };
  }

  async restore(
    companyId: string,
    userId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ClientResponseDto> {
    const existing = await this.prisma.client.findFirst({
      where: { id, companyId, archivedAt: { not: null } },
      include: this.clientInclude(),
    });

    if (!existing) {
      throw new NotFoundException('Archived client not found.');
    }

    await this.ensureUniqueContact(companyId, existing.normalizedMobile, existing.normalizedEmail, id);

    const activeStatus = await this.prisma.masterData.findFirst({
      where: {
        companyId,
        category: 'client_status',
        code: 'active',
        isActive: true,
      },
    });

    const restored = await this.prisma.client.update({
      where: { id },
      data: {
        isActive: true,
        archivedAt: null,
        archivedById: null,
        archivedReason: null,
        statusId: activeStatus?.id ?? existing.statusId,
        updatedById: userId,
      },
      include: this.clientInclude(),
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'clients',
      action: 'restore',
      recordType: 'client',
      recordId: id,
      previousValue: this.auditSnapshot(existing),
      newValue: this.auditSnapshot(restored),
      ipAddress,
      userAgent,
    });

    return this.mapClient(restored);
  }

  private clientInclude() {
    return {
      status: true,
      bookings: {
        where: { isActive: true, archivedAt: null },
        select: { totalAmount: true },
      },
      invoices: {
        where: { isActive: true, archivedAt: null },
        select: { totalAmount: true, outstandingAmount: true },
      },
    } satisfies Prisma.ClientInclude;
  }

  private mapClient(client: ClientWithRelations): ClientResponseDto {
    const totalBookings = client.bookings.length;
    const totalAmount = client.bookings.reduce(
      (sum, booking) => sum + Number(booking.totalAmount),
      0,
    );
    const outstandingBalance = client.invoices.reduce(
      (sum, invoice) => sum + Number(invoice.outstandingAmount),
      0,
    );

    return {
      id: client.id,
      clientNumber: client.clientNumber,
      fullName: client.fullName,
      mobile: client.mobile,
      whatsapp: client.whatsapp,
      email: client.email,
      address: client.address,
      city: client.city,
      dateOfBirth: toDateOnlyString(client.dateOfBirth),
      anniversaryDate: toDateOnlyString(client.anniversaryDate),
      notes: client.notes,
      status: client.status?.label ?? (client.archivedAt ? 'Archived' : client.isActive ? 'Active' : 'Inactive'),
      isActive: client.isActive,
      archivedAt: client.archivedAt?.toISOString() ?? null,
      totalBookings,
      totalAmount,
      outstandingBalance,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }

  private buildWhereClause(
    companyId: string,
    search?: string,
    status: 'active' | 'inactive' | 'all' = 'active',
  ): Prisma.ClientWhereInput {
    const where: Prisma.ClientWhereInput = {
      companyId,
    };

    if (status === 'active') {
      where.archivedAt = null;
      where.isActive = true;
    } else if (status === 'inactive') {
      where.OR = [{ isActive: false }, { archivedAt: { not: null } }];
    }

    if (search?.trim()) {
      const term = search.trim();
      const searchOr: Prisma.ClientWhereInput = {
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          { mobile: { contains: term } },
          { email: { contains: term, mode: 'insensitive' } },
          { city: { contains: term, mode: 'insensitive' } },
          { clientNumber: { contains: term, mode: 'insensitive' } },
        ],
      };

      if (where.OR) {
        where.AND = [{ OR: where.OR }, searchOr];
        delete where.OR;
      } else {
        Object.assign(where, searchOr);
      }
    }

    return where;
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Prisma.ClientOrderByWithRelationInput {
    const direction = sortOrder;

    switch (sortBy) {
      case 'fullName':
        return { fullName: direction };
      case 'mobile':
        return { mobile: direction };
      case 'email':
        return { email: direction };
      case 'city':
        return { city: direction };
      default:
        return { createdAt: direction };
    }
  }

  private compareClients(
    a: ClientResponseDto,
    b: ClientResponseDto,
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): number {
    const direction = sortOrder === 'asc' ? 1 : -1;

    const getValue = (client: ClientResponseDto): string | number => {
      switch (sortBy) {
        case 'totalBookings':
          return client.totalBookings;
        case 'totalAmount':
          return client.totalAmount;
        case 'outstandingBalance':
          return client.outstandingBalance;
        default:
          return client.createdAt;
      }
    };

    const left = getValue(a);
    const right = getValue(b);

    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * direction;
    }

    return String(left).localeCompare(String(right)) * direction;
  }

  private async ensureUniqueContact(
    companyId: string,
    normalizedMobile: string,
    normalizedEmail: string | null,
    excludeClientId?: string,
  ): Promise<void> {
    const mobileConflict = await this.prisma.client.findFirst({
      where: {
        companyId,
        normalizedMobile,
        archivedAt: null,
        ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
      },
    });

    if (mobileConflict) {
      throw new ConflictException('A client with this mobile number already exists.');
    }

    if (normalizedEmail) {
      const emailConflict = await this.prisma.client.findFirst({
        where: {
          companyId,
          normalizedEmail,
          archivedAt: null,
          ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
        },
      });

      if (emailConflict) {
        throw new ConflictException('A client with this email already exists.');
      }
    }
  }

  private async generateClientNumber(
    companyId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<string> {
    const latest = await tx.client.findFirst({
      where: { companyId },
      orderBy: { clientNumber: 'desc' },
      select: { clientNumber: true },
    });

    return allocateNextClientNumber(latest?.clientNumber);
  }

  private auditSnapshot(client: ClientWithRelations): Prisma.InputJsonValue {
    return {
      clientNumber: client.clientNumber,
      fullName: client.fullName,
      mobile: client.mobile,
      email: client.email,
      whatsapp: client.whatsapp,
      city: client.city,
      isActive: client.isActive,
    };
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private getNextOccurrence(date: Date, from: Date): Date {
    const next = new Date(from.getFullYear(), date.getMonth(), date.getDate());

    if (next < from) {
      next.setFullYear(next.getFullYear() + 1);
    }

    return next;
  }

  private daysBetween(from: Date, to: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((to.getTime() - from.getTime()) / msPerDay);
  }
}

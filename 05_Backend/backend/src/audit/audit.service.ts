import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import {
  AuditLogResponseDto,
  PaginatedAuditLogsResponseDto,
} from './dto/audit-log-response.dto';

export interface AuditLogInput {
  companyId: string;
  actorUserId?: string;
  module: string;
  action: string;
  recordType: string;
  recordId: string;
  previousValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        module: input.module,
        action: input.action,
        recordType: input.recordType,
        recordId: input.recordId,
        previousValue: input.previousValue,
        newValue: input.newValue,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async findAll(
    companyId: string,
    query: ListAuditLogsQueryDto,
  ): Promise<PaginatedAuditLogsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const where: Prisma.AuditLogWhereInput = { companyId };

    if (query.module) {
      where.module = query.module;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { module: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { recordType: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { actorUser: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: logs.map((log) => this.mapLog(log)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private mapLog(log: {
    id: string;
    module: string;
    action: string;
    recordType: string;
    recordId: string;
    actorUserId: string | null;
    previousValue: Prisma.JsonValue | null;
    newValue: Prisma.JsonValue | null;
    ipAddress: string | null;
    createdAt: Date;
    actorUser: { fullName: string } | null;
  }): AuditLogResponseDto {
    return {
      id: log.id,
      module: log.module,
      action: log.action,
      recordType: log.recordType,
      recordId: log.recordId,
      actorUserId: log.actorUserId,
      actorName: log.actorUser?.fullName ?? null,
      previousValue: (log.previousValue as Record<string, unknown> | null) ?? null,
      newValue: (log.newValue as Record<string, unknown> | null) ?? null,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    };
  }
}

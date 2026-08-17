import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import {
  PaginatedPaymentsResponseDto,
  PaymentResponseDto,
} from './dto/payment-response.dto';
import {
  generateReceiptNumber,
  getPaymentTotalForInvoice,
  isReceiptNumberUniqueConflict,
  syncInvoiceAndBookingFinancials,
} from '../common/utils/financial.utils';
import { parseOptionalDate } from '../invoices/utils/invoice.utils';
import { roundMoney, toDecimal } from '../bookings/utils/booking.utils';

type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    client: { select: { fullName: true; mobile: true } };
    invoice: { select: { invoiceNumber: true; totalAmount: true; outstandingAmount: true } };
    booking: { select: { bookingNumber: true } };
    paymentMode: { select: { code: true; label: true } };
  };
}>;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    companyId: string,
    query: ListPaymentsQueryDto,
  ): Promise<PaginatedPaymentsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = await this.buildWhereClause(companyId, query);

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: this.paymentInclude(),
        orderBy: this.buildOrderBy(query.sortBy ?? 'paymentDate', query.sortOrder ?? 'desc'),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items: payments.map((payment) => this.mapPayment(payment)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(companyId: string, id: string): Promise<PaymentResponseDto> {
    const payment = await this.getPaymentOrThrow(companyId, id);
    return this.mapPayment(payment);
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreatePaymentDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PaymentResponseDto> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, companyId, archivedAt: null, isActive: true },
      include: {
        booking: { select: { id: true, branchId: true, clientId: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    const amount = roundMoney(dto.amount);
    const outstanding = Number(invoice.outstandingAmount);

    if (amount > outstanding) {
      throw new BadRequestException(
        `Payment amount cannot exceed outstanding balance of ₹${outstanding}.`,
      );
    }

    const paymentMode = await this.resolvePaymentMode(companyId, dto.paymentModeCode);
    const paymentDate = dto.paymentDate
      ? parseOptionalDate(dto.paymentDate) ?? new Date()
      : new Date();

    const previousBalance = outstanding;

    const maxAttempts = 5;
    let lastError: unknown;
    let payment: PaymentWithRelations | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        payment = await this.prisma.$transaction(async (tx) => {
          const receiptNumber = await generateReceiptNumber(tx, companyId);

          const created = await tx.payment.create({
            data: {
              companyId,
              branchId: invoice.branchId,
              clientId: invoice.clientId,
              bookingId: invoice.bookingId,
              invoiceId: invoice.id,
              paymentModeId: paymentMode.id,
              receiptNumber,
              amount: toDecimal(amount),
              paymentDate,
              transactionReference: dto.transactionReference?.trim() || null,
              notes: dto.notes?.trim() || null,
              createdById: userId,
              updatedById: userId,
            },
            include: this.paymentInclude(),
          });

          await syncInvoiceAndBookingFinancials(tx, invoice.id);

          return created;
        });
        break;
      } catch (error) {
        lastError = error;
        if (!isReceiptNumberUniqueConflict(error) || attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }

    if (!payment) {
      throw lastError instanceof Error ? lastError : new Error('Failed to create payment.');
    }

    const mapped = this.mapPayment(payment);
    mapped.previousBalance = previousBalance;
    mapped.remainingBalance = roundMoney(previousBalance - amount);

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'payments',
      action: 'create',
      recordType: 'payment',
      recordId: payment.id,
      newValue: {
        receiptNumber: payment.receiptNumber,
        invoiceId: payment.invoiceId,
        amount,
      },
      ipAddress,
      userAgent,
    });

    return mapped;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdatePaymentDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PaymentResponseDto> {
    const existing = await this.getPaymentOrThrow(companyId, id);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: existing.invoiceId, companyId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    const paymentMode = dto.paymentModeCode
      ? await this.resolvePaymentMode(companyId, dto.paymentModeCode)
      : null;

    if (dto.amount !== undefined) {
      const currentTotal = await getPaymentTotalForInvoice(this.prisma, existing.invoiceId);
      const otherPaymentsTotal = roundMoney(currentTotal - Number(existing.amount));
      const newTotal = roundMoney(otherPaymentsTotal + dto.amount);
      const totalAmount = Number(invoice.totalAmount);

      if (newTotal > totalAmount) {
        throw new BadRequestException('Updated payment would exceed invoice total.');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data: {
          ...(dto.amount !== undefined ? { amount: toDecimal(roundMoney(dto.amount)) } : {}),
          ...(paymentMode ? { paymentModeId: paymentMode.id } : {}),
          ...(dto.paymentDate !== undefined
            ? { paymentDate: parseOptionalDate(dto.paymentDate) ?? new Date() }
            : {}),
          ...(dto.transactionReference !== undefined
            ? { transactionReference: dto.transactionReference?.trim() || null }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
          updatedById: userId,
        },
        include: this.paymentInclude(),
      });

      await syncInvoiceAndBookingFinancials(tx, existing.invoiceId);

      return payment;
    });

    await this.auditService.log({
      companyId,
      actorUserId: userId,
      module: 'payments',
      action: 'update',
      recordType: 'payment',
      recordId: id,
      previousValue: { amount: Number(existing.amount) },
      newValue: { amount: Number(updated.amount) },
      ipAddress,
      userAgent,
    });

    return this.mapPayment(updated);
  }

  async backfillAdvancePayments(companyId: string, userId: string): Promise<void> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        archivedAt: null,
        isActive: true,
        advanceAmount: { gt: 0 },
      },
      include: {
        payments: { where: { archivedAt: null, isActive: true } },
        booking: true,
      },
    });

    for (const invoice of invoices) {
      if (invoice.payments.length > 0) {
        continue;
      }

      const advance = Number(invoice.advanceAmount);
      if (advance <= 0) {
        continue;
      }

      const cashMode = await this.resolvePaymentMode(companyId, 'cash');

      await this.prisma.$transaction(async (tx) => {
        const existingPayments = await tx.payment.count({
          where: { invoiceId: invoice.id, archivedAt: null, isActive: true },
        });

        if (existingPayments > 0) {
          return;
        }

        const receiptNumber = await generateReceiptNumber(tx, companyId);

        await tx.payment.create({
          data: {
            companyId,
            branchId: invoice.branchId,
            clientId: invoice.clientId,
            bookingId: invoice.bookingId,
            invoiceId: invoice.id,
            paymentModeId: cashMode.id,
            receiptNumber,
            amount: toDecimal(advance),
            paymentDate: invoice.invoiceDate,
            notes: 'Booking advance recorded at invoice generation',
            createdById: userId,
            updatedById: userId,
          },
        });

        await syncInvoiceAndBookingFinancials(tx, invoice.id);
      });
    }
  }

  private paymentInclude() {
    return {
      client: { select: { fullName: true, mobile: true } },
      invoice: {
        select: { invoiceNumber: true, totalAmount: true, outstandingAmount: true },
      },
      booking: { select: { bookingNumber: true } },
      paymentMode: { select: { code: true, label: true } },
    };
  }

  private async getPaymentOrThrow(
    companyId: string,
    id: string,
  ): Promise<PaymentWithRelations> {
    const payment = await this.prisma.payment.findFirst({
      where: { id, companyId, archivedAt: null },
      include: this.paymentInclude(),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    return payment;
  }

  private mapPayment(payment: PaymentWithRelations): PaymentResponseDto {
    return {
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      invoiceId: payment.invoiceId,
      invoiceNumber: payment.invoice.invoiceNumber,
      bookingId: payment.bookingId,
      bookingNumber: payment.booking.bookingNumber,
      clientId: payment.clientId,
      clientName: payment.client.fullName,
      clientMobile: payment.client.mobile,
      amount: Number(payment.amount),
      paymentDate: payment.paymentDate.toISOString().slice(0, 10),
      paymentModeCode: payment.paymentMode.code,
      paymentModeLabel: payment.paymentMode.label,
      transactionReference: payment.transactionReference,
      notes: payment.notes,
      remainingBalance: Number(payment.invoice.outstandingAmount),
      createdAt: payment.createdAt.toISOString(),
    };
  }

  private async buildWhereClause(
    companyId: string,
    query: ListPaymentsQueryDto,
  ): Promise<Prisma.PaymentWhereInput> {
    const where: Prisma.PaymentWhereInput = {
      companyId,
      archivedAt: null,
      isActive: true,
    };

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.invoiceId) {
      where.invoiceId = query.invoiceId;
    }

    if (query.paymentModeCode) {
      const mode = await this.resolvePaymentMode(companyId, query.paymentModeCode);
      where.paymentModeId = mode.id;
    }

    if (query.dateFrom || query.dateTo) {
      where.paymentDate = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { receiptNumber: { contains: term, mode: 'insensitive' } },
        { invoice: { invoiceNumber: { contains: term, mode: 'insensitive' } } },
        { booking: { bookingNumber: { contains: term, mode: 'insensitive' } } },
        { client: { fullName: { contains: term, mode: 'insensitive' } } },
        { client: { mobile: { contains: term } } },
        { transactionReference: { contains: term, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Prisma.PaymentOrderByWithRelationInput {
    switch (sortBy) {
      case 'amount':
        return { amount: sortOrder };
      case 'createdAt':
        return { createdAt: sortOrder };
      default:
        return { paymentDate: sortOrder };
    }
  }

  private async resolvePaymentMode(companyId: string, code: string) {
    const mode = await this.prisma.masterData.findFirst({
      where: { companyId, category: 'payment_mode', code, isActive: true },
    });

    if (!mode) {
      throw new BadRequestException(`Invalid payment method: ${code}`);
    }

    return mode;
  }
}

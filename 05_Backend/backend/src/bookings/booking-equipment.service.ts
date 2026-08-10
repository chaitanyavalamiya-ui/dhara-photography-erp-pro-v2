import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingActivityService } from './booking-activity.service';
import {
  CheckoutEquipmentDto,
  CreateBookingEquipmentDto,
  ReturnEquipmentDto,
} from './dto/booking-operations.dto';
import {
  computeEquipmentStatus,
  getEquipmentStatusLabel,
} from './utils/booking-operations.utils';
import { toDecimal } from './utils/booking.utils';

@Injectable()
export class BookingEquipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: BookingActivityService,
  ) {}

  async listForBooking(companyId: string, bookingId: string) {
    await this.assertBooking(companyId, bookingId);

    const items = await this.prisma.bookingEquipment.findMany({
      where: { bookingId, archivedAt: null },
      orderBy: [{ createdAt: 'asc' }],
    });

    return items.map((item) => this.mapEquipment(item));
  }

  async create(
    companyId: string,
    userId: string,
    bookingId: string,
    dto: CreateBookingEquipmentDto,
  ) {
    await this.assertBooking(companyId, bookingId);

    const item = await this.prisma.bookingEquipment.create({
      data: {
        bookingId,
        equipmentName: dto.equipmentName.trim(),
        quantityIssued: toDecimal(dto.quantityIssued ?? 0),
        createdById: userId,
        updatedById: userId,
      },
    });

    await this.activityService.log(
      companyId,
      bookingId,
      'equipment_added',
      `Equipment item added: ${item.equipmentName}`,
      userId,
    );

    return this.mapEquipment(item);
  }

  async checkout(
    companyId: string,
    userId: string,
    bookingId: string,
    equipmentId: string,
    dto: CheckoutEquipmentDto,
  ) {
    await this.assertBooking(companyId, bookingId);
    const existing = await this.getEquipmentOrThrow(bookingId, equipmentId);

    const quantityIssued = dto.quantityIssued;
    const status = computeEquipmentStatus(quantityIssued, 0, 0, 0);
    const issuedAt = new Date();

    const item = await this.prisma.bookingEquipment.update({
      where: { id: equipmentId },
      data: {
        quantityIssued: toDecimal(quantityIssued),
        quantityReturned: toDecimal(0),
        missingQuantity: toDecimal(0),
        damagedQuantity: toDecimal(0),
        status,
        issuedByName: dto.issuedByName?.trim() || null,
        issuedAt,
        conditionCheckout: dto.conditionCheckout?.trim() || null,
        checkoutNotes: dto.checkoutNotes?.trim() || null,
        updatedById: userId,
      },
    });

    await this.activityService.log(
      companyId,
      bookingId,
      'equipment_issued',
      `${item.equipmentName} issued (${quantityIssued})`,
      userId,
      undefined,
      issuedAt,
    );

    return this.mapEquipment(item);
  }

  async returnEquipment(
    companyId: string,
    userId: string,
    bookingId: string,
    equipmentId: string,
    dto: ReturnEquipmentDto,
  ) {
    await this.assertBooking(companyId, bookingId);
    const existing = await this.getEquipmentOrThrow(bookingId, equipmentId);

    const quantityIssued = Number(existing.quantityIssued);
    const quantityReturned = dto.quantityReturned;
    const missingQuantity = dto.missingQuantity ?? 0;
    const damagedQuantity = dto.damagedQuantity ?? 0;
    const status = computeEquipmentStatus(
      quantityIssued,
      quantityReturned,
      missingQuantity,
      damagedQuantity,
    );
    const returnedAt = new Date();

    const item = await this.prisma.bookingEquipment.update({
      where: { id: equipmentId },
      data: {
        quantityReturned: toDecimal(quantityReturned),
        missingQuantity: toDecimal(missingQuantity),
        damagedQuantity: toDecimal(damagedQuantity),
        status,
        returnedAt,
        conditionReturn: dto.conditionReturn?.trim() || null,
        returnNotes: dto.returnNotes?.trim() || null,
        updatedById: userId,
      },
    });

    await this.activityService.log(
      companyId,
      bookingId,
      'equipment_returned',
      `${item.equipmentName} returned (${quantityReturned}/${quantityIssued})`,
      userId,
      undefined,
      returnedAt,
    );

    return this.mapEquipment(item);
  }

  async remove(companyId: string, userId: string, bookingId: string, equipmentId: string) {
    await this.assertBooking(companyId, bookingId);
    await this.getEquipmentOrThrow(bookingId, equipmentId);

    await this.prisma.bookingEquipment.update({
      where: { id: equipmentId },
      data: {
        isActive: false,
        archivedAt: new Date(),
        updatedById: userId,
      },
    });

    return { message: 'Equipment item removed successfully.' };
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

  private async getEquipmentOrThrow(bookingId: string, equipmentId: string) {
    const item = await this.prisma.bookingEquipment.findFirst({
      where: { id: equipmentId, bookingId, archivedAt: null },
    });

    if (!item) {
      throw new NotFoundException('Equipment item not found.');
    }

    return item;
  }

  private mapEquipment(item: {
    id: string;
    equipmentName: string;
    quantityIssued: { toString(): string };
    quantityReturned: { toString(): string };
    status: string;
    issuedByName: string | null;
    issuedAt: Date | null;
    returnedAt: Date | null;
    conditionCheckout: string | null;
    conditionReturn: string | null;
    missingQuantity: { toString(): string };
    damagedQuantity: { toString(): string };
    checkoutNotes: string | null;
    returnNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      equipmentName: item.equipmentName,
      quantityIssued: Number(item.quantityIssued),
      quantityReturned: Number(item.quantityReturned),
      status: item.status,
      statusLabel: getEquipmentStatusLabel(item.status),
      issuedByName: item.issuedByName,
      issuedAt: item.issuedAt?.toISOString() ?? null,
      returnedAt: item.returnedAt?.toISOString() ?? null,
      conditionCheckout: item.conditionCheckout,
      conditionReturn: item.conditionReturn,
      missingQuantity: Number(item.missingQuantity),
      damagedQuantity: Number(item.damagedQuantity),
      checkoutNotes: item.checkoutNotes,
      returnNotes: item.returnNotes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

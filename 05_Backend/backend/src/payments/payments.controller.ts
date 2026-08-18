import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import {
  PaginatedPaymentsResponseDto,
  PaymentResponseDto,
} from './dto/payment-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'List payments with search and filters' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListPaymentsQueryDto,
  ): Promise<PaginatedPaymentsResponseDto> {
    return this.paymentsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Get payment details' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions('payments.create')
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.create(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  @RequirePermissions('payments.update')
  @ApiOperation({ summary: 'Update a payment record' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @Req() req: Request,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.update(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post(':id/void')
  @RequirePermissions('payments.update')
  @ApiOperation({ summary: 'Void a payment without deleting the original receipt' })
  async void(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.void(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }
}

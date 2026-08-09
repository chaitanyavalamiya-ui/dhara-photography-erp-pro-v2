import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import {
  InvoiceResponseDto,
  PaginatedInvoicesResponseDto,
} from './dto/invoice-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermissions('invoices.read')
  @ApiOperation({ summary: 'List invoices with search, filter, and pagination' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListInvoicesQueryDto,
  ): Promise<PaginatedInvoicesResponseDto> {
    return this.invoicesService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions('invoices.read')
  @ApiOperation({ summary: 'Get invoice details' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions('invoices.create')
  @ApiOperation({ summary: 'Generate invoice from booking' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInvoiceDto,
    @Req() req: Request,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.create(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  @RequirePermissions('invoices.update')
  @ApiOperation({ summary: 'Update invoice notes, due date, or advance payment' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @Req() req: Request,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.update(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @RequirePermissions('invoices.update')
  @ApiOperation({ summary: 'Archive an invoice' })
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.invoicesService.archive(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }
}

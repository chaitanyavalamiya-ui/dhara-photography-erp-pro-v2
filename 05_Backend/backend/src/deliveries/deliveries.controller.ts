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
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto, UpdateDeliveryDto } from './dto/create-delivery.dto';
import { ListDeliveriesQueryDto } from './dto/list-deliveries-query.dto';
import {
  DeliveryResponseDto,
  PaginatedDeliveriesResponseDto,
} from './dto/delivery-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Deliveries')
@ApiBearerAuth()
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @RequirePermissions('delivery.read')
  @ApiOperation({ summary: 'List delivery items' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListDeliveriesQueryDto,
  ): Promise<PaginatedDeliveriesResponseDto> {
    return this.deliveriesService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions('delivery.read')
  @ApiOperation({ summary: 'Get delivery item details' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<DeliveryResponseDto> {
    return this.deliveriesService.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions('delivery.create')
  @ApiOperation({ summary: 'Create a delivery item' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDeliveryDto,
    @Req() req: Request,
  ): Promise<DeliveryResponseDto> {
    return this.deliveriesService.create(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  @RequirePermissions('delivery.update')
  @ApiOperation({ summary: 'Update a delivery item' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryDto,
    @Req() req: Request,
  ): Promise<DeliveryResponseDto> {
    return this.deliveriesService.update(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @RequirePermissions('delivery.update')
  @ApiOperation({ summary: 'Archive a delivery item' })
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.deliveriesService.archive(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }
}

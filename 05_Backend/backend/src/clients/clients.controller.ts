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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import {
  ClientResponseDto,
  PaginatedClientsResponseDto,
  UpcomingClientEventDto,
} from './dto/client-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermissions('clients.read')
  @ApiOperation({ summary: 'List clients with search, filter, and sort' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListClientsQueryDto,
  ): Promise<PaginatedClientsResponseDto> {
    return this.clientsService.findAll(user.companyId, query);
  }

  @Get('upcoming-events')
  @RequirePermissions('clients.read')
  @ApiOperation({ summary: 'Upcoming birthdays and anniversaries' })
  async getUpcomingEvents(
    @CurrentUser() user: JwtPayload,
  ): Promise<UpcomingClientEventDto[]> {
    return this.clientsService.getUpcomingEvents(user.companyId);
  }

  @Get(':id')
  @RequirePermissions('clients.read')
  @ApiOperation({ summary: 'Get client details' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ClientResponseDto> {
    return this.clientsService.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions('clients.create')
  @ApiOperation({ summary: 'Create a new client' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateClientDto,
    @Req() req: Request,
  ): Promise<ClientResponseDto> {
    return this.clientsService.create(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  @RequirePermissions('clients.update')
  @ApiOperation({ summary: 'Update an existing client' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @Req() req: Request,
  ): Promise<ClientResponseDto> {
    return this.clientsService.update(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @RequirePermissions('clients.archive')
  @ApiOperation({ summary: 'Archive (delete) a client' })
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.clientsService.archive(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }
}

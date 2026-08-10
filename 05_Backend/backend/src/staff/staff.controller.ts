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
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import {
  PaginatedStaffResponseDto,
  StaffDetailResponseDto,
  StaffResponseDto,
} from './dto/staff-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequirePermissions('staff.read')
  @ApiOperation({ summary: 'List staff with search, filter, and sort' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListStaffQueryDto,
  ): Promise<PaginatedStaffResponseDto> {
    return this.staffService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions('staff.read')
  @ApiOperation({ summary: 'Get staff member details with profile data' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<StaffDetailResponseDto> {
    return this.staffService.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions('staff.create')
  @ApiOperation({ summary: 'Create a new staff member' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStaffDto,
    @Req() req: Request,
  ): Promise<StaffResponseDto> {
    return this.staffService.create(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  @RequirePermissions('staff.update')
  @ApiOperation({ summary: 'Update an existing staff member' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @Req() req: Request,
  ): Promise<StaffResponseDto> {
    return this.staffService.update(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @RequirePermissions('staff.archive')
  @ApiOperation({ summary: 'Archive (delete) a staff member' })
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.staffService.archive(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }
}

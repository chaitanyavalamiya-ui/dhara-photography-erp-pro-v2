import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { EquipmentService } from './equipment.service';
import {
  CreateEquipmentCategoryDto,
  CreateEquipmentDto,
  CreateEquipmentIssueDto,
  CreateEquipmentReturnDto,
  ListEquipmentCategoriesQueryDto,
  ListEquipmentQueryDto,
  ListIssuesQueryDto,
  UpdateEquipmentCategoryDto,
  UpdateEquipmentDto,
} from './dto/equipment.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @RequirePermissions('equipment.read')
  @ApiOperation({ summary: 'List equipment inventory' })
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: ListEquipmentQueryDto) {
    return this.equipmentService.findAll(user.companyId, query);
  }

  @Get('dashboard')
  @RequirePermissions('equipment.read')
  @ApiOperation({ summary: 'Equipment inventory KPIs' })
  async dashboard(@CurrentUser() user: JwtPayload) {
    return this.equipmentService.getDashboard(user.companyId);
  }

  @Get('issues')
  @RequirePermissions('equipment.read')
  @ApiOperation({ summary: 'List equipment issues' })
  async listIssues(@CurrentUser() user: JwtPayload, @Query() query: ListIssuesQueryDto) {
    return this.equipmentService.listIssues(user.companyId, query);
  }

  @Get('issues/:issueId')
  @RequirePermissions('equipment.read')
  @ApiOperation({ summary: 'Get equipment issue checklist' })
  async getIssue(@CurrentUser() user: JwtPayload, @Param('issueId') issueId: string) {
    return this.equipmentService.getIssue(user.companyId, issueId);
  }

  @Get('bookings/:bookingId')
  @RequirePermissions('equipment.read')
  @ApiOperation({ summary: 'Booking equipment used and return summary' })
  async bookingOverview(@CurrentUser() user: JwtPayload, @Param('bookingId') bookingId: string) {
    return this.equipmentService.getBookingOverview(user.companyId, bookingId);
  }

  @Get('staff/:staffId')
  @RequirePermissions('equipment.read')
  @ApiOperation({ summary: 'Staff equipment issue history' })
  async staffSummary(@CurrentUser() user: JwtPayload, @Param('staffId') staffId: string) {
    return this.equipmentService.getStaffSummary(user.companyId, staffId);
  }

  @Get('categories')
  @RequirePermissions('equipment.read')
  @ApiOperation({ summary: 'List equipment categories' })
  async listCategories(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListEquipmentCategoriesQueryDto,
  ) {
    return this.equipmentService.listCategories(user.companyId, query.includeInactive);
  }

  @Post('categories')
  @RequirePermissions('equipment.write')
  @ApiOperation({ summary: 'Create an equipment category' })
  async createCategory(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEquipmentCategoryDto,
    @Req() req: Request,
  ) {
    return this.equipmentService.createCategory(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch('categories/:id')
  @RequirePermissions('equipment.write')
  @ApiOperation({ summary: 'Update an equipment category' })
  async updateCategory(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentCategoryDto,
    @Req() req: Request,
  ) {
    return this.equipmentService.updateCategory(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get(':id')
  @RequirePermissions('equipment.read')
  @ApiOperation({ summary: 'Get equipment details and history' })
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.equipmentService.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions('equipment.write')
  @ApiOperation({ summary: 'Add equipment to inventory' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEquipmentDto,
    @Req() req: Request,
  ) {
    return this.equipmentService.create(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  @RequirePermissions('equipment.write')
  @ApiOperation({ summary: 'Update equipment inventory item' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    return this.equipmentService.update(user.companyId, user.sub, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('equipment.write')
  @ApiOperation({ summary: 'Archive equipment' })
  async archive(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.equipmentService.archive(user.companyId, user.sub, id);
  }

  @Post('issues')
  @RequirePermissions('equipment.issue')
  @ApiOperation({ summary: 'Issue equipment for a booking / shoot' })
  async createIssue(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEquipmentIssueDto,
    @Req() req: Request,
  ) {
    return this.equipmentService.createIssue(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('issues/:issueId/returns')
  @RequirePermissions('equipment.return')
  @ApiOperation({ summary: 'Return equipment against an issue checklist' })
  async returnIssue(
    @CurrentUser() user: JwtPayload,
    @Param('issueId') issueId: string,
    @Body() dto: CreateEquipmentReturnDto,
    @Req() req: Request,
  ) {
    return this.equipmentService.returnIssue(
      user.companyId,
      user.sub,
      issueId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }
}

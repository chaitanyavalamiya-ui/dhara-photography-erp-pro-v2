import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RolesService } from './roles.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { RoleDetailDto, RoleSummaryDto } from './dto/role-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'List roles with permission counts' })
  async findAll(@CurrentUser() user: JwtPayload): Promise<RoleSummaryDto[]> {
    return this.rolesService.findAll(user.companyId);
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'Get role details with grouped permissions' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<RoleDetailDto> {
    return this.rolesService.findOne(user.companyId, id);
  }

  @Patch(':id/permissions')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Update granted permissions for a role' })
  async updatePermissions(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @Req() req: Request,
  ): Promise<RoleDetailDto> {
    return this.rolesService.updatePermissions(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { PaginatedAuditLogsResponseDto } from './dto/audit-log-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'List audit activity logs' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<PaginatedAuditLogsResponseDto> {
    return this.auditService.findAll(user.companyId, query);
  }
}

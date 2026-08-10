import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { MonthlySummaryQueryDto, ReportsDateQueryDto } from './dto/reports-query.dto';
import {
  BookingReportRowDto,
  ExpenseReportRowDto,
  MonthlySummaryRowDto,
  PaymentReportRowDto,
  ProfitReportDto,
  ReportDateRangeDto,
  ReportsOverviewDto,
} from './dto/reports-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Reports overview summary' })
  async getOverview(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsDateQueryDto,
  ): Promise<ReportsOverviewDto> {
    return this.reportsService.getOverview(user.companyId, user.sub, query);
  }

  @Get('bookings')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Booking profitability report' })
  async getBookingReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsDateQueryDto,
  ): Promise<{ period: ReportDateRangeDto; items: BookingReportRowDto[]; total: number }> {
    return this.reportsService.getBookingReport(user.companyId, query);
  }

  @Get('payments')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Payment report' })
  async getPaymentReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsDateQueryDto,
  ): Promise<{ period: ReportDateRangeDto; items: PaymentReportRowDto[]; total: number }> {
    return this.reportsService.getPaymentReport(user.companyId, query);
  }

  @Get('expenses')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Expense report' })
  async getExpenseReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsDateQueryDto,
  ): Promise<{ period: ReportDateRangeDto; items: ExpenseReportRowDto[]; total: number }> {
    return this.reportsService.getExpenseReport(user.companyId, query);
  }

  @Get('profit')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Profit summary report' })
  async getProfitReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsDateQueryDto,
  ): Promise<ProfitReportDto> {
    return this.reportsService.getProfitReport(user.companyId, user.sub, query);
  }

  @Get('monthly-summary')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Month-wise financial summary' })
  async getMonthlySummary(
    @CurrentUser() user: JwtPayload,
    @Query() query: MonthlySummaryQueryDto,
  ): Promise<MonthlySummaryRowDto[]> {
    return this.reportsService.getMonthlySummary(user.companyId, query.months ?? 12);
  }
}

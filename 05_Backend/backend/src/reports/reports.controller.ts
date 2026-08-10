import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import {
  MonthlySummaryQueryDto,
  ReportsDateQueryDto,
  ReportsExpensesQueryDto,
  ReportsIncomeQueryDto,
  ReportsTransactionsQueryDto,
} from './dto/reports-query.dto';
import {
  BookingReportRowDto,
  ExpenseReportRowDto,
  MonthlySummaryRowDto,
  PaymentReportRowDto,
  ProfitReportDto,
  ReportDateRangeDto,
  ReportsChartsDto,
  ReportsDashboardDto,
  ReportsOverviewDto,
  StaffReportRowDto,
} from './dto/reports-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BookingProfitabilityDto } from '../accounts/dto/accounts-response.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Reports dashboard KPIs' })
  async getDashboard(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsDateQueryDto,
  ): Promise<ReportsDashboardDto> {
    return this.reportsService.getDashboard(user.companyId, user.sub, query);
  }

  @Get('overview')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Reports overview summary' })
  async getOverview(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsDateQueryDto,
  ): Promise<ReportsOverviewDto> {
    return this.reportsService.getOverview(user.companyId, user.sub, query);
  }

  @Get('income')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Income report with search and pagination' })
  async getIncomeReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsIncomeQueryDto,
  ) {
    return this.reportsService.getIncomeReport(user.companyId, query);
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

  @Get('bookings/:bookingId/profitability')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Single booking profitability detail' })
  async getBookingProfitability(
    @CurrentUser() user: JwtPayload,
    @Param('bookingId') bookingId: string,
  ): Promise<BookingProfitabilityDto> {
    return this.reportsService.getBookingProfitability(user.companyId, bookingId);
  }

  @Get('payments')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Payment / income report' })
  async getPaymentReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsIncomeQueryDto,
  ): Promise<{
    period: ReportDateRangeDto;
    items: PaymentReportRowDto[];
    total: number;
    totalAmount: number;
  }> {
    return this.reportsService.getPaymentReport(user.companyId, query);
  }

  @Get('expenses')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Expense report' })
  async getExpenseReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsExpensesQueryDto,
  ): Promise<{
    period: ReportDateRangeDto;
    items: ExpenseReportRowDto[];
    total: number;
    totalAmount: number;
  }> {
    return this.reportsService.getExpenseReport(user.companyId, query);
  }

  @Get('profit')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Profit & loss summary report' })
  async getProfitReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsDateQueryDto,
  ): Promise<ProfitReportDto> {
    return this.reportsService.getProfitReport(user.companyId, user.sub, query);
  }

  @Get('staff')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Staff payments summary report' })
  async getStaffReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsDateQueryDto,
  ): Promise<{ period: ReportDateRangeDto; items: StaffReportRowDto[]; total: number }> {
    return this.reportsService.getStaffReport(user.companyId, query);
  }

  @Get('transactions')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Financial transactions report' })
  async getTransactionsReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsTransactionsQueryDto,
  ) {
    return this.reportsService.getTransactionsReport(user.companyId, query);
  }

  @Get('charts')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Chart data for reports dashboard' })
  async getCharts(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsDateQueryDto,
  ): Promise<ReportsChartsDto> {
    return this.reportsService.getCharts(user.companyId, user.sub, query);
  }

  @Get('monthly-summary')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Month-wise financial summary' })
  async getMonthlySummary(
    @CurrentUser() user: JwtPayload,
    @Query() query: MonthlySummaryQueryDto,
  ): Promise<MonthlySummaryRowDto[]> {
    return this.reportsService.getMonthlySummary(user.companyId, query);
  }
}

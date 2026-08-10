import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import {
  AccountsDateQueryDto,
  AccountsExpensesQueryDto,
  AccountsIncomeQueryDto,
  AccountsMonthlySummaryQueryDto,
  AccountsTransactionsQueryDto,
} from './dto/accounts-query.dto';
import {
  AccountsDashboardDto,
  AccountsExpenseBreakdownDto,
  AccountsPeriodSummaryDto,
  BookingProfitabilityDto,
  MonthlyFinancialRowDto,
  MonthlyReportDto,
  MonthlyReportQueryDto,
  PaginatedAccountTransactionsDto,
  PaginatedIncomeDto,
  PaginatedStaffPaymentsDto,
  ProfitLossDto,
} from './dto/accounts-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('dashboard')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'All-time accounts dashboard summary' })
  async getDashboard(@CurrentUser() user: JwtPayload): Promise<AccountsDashboardDto> {
    return this.accountsService.getDashboard(user.companyId, user.sub);
  }

  @Get('summary')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Period-scoped financial summary' })
  async getPeriodSummary(
    @CurrentUser() user: JwtPayload,
    @Query() query: AccountsDateQueryDto,
  ): Promise<AccountsPeriodSummaryDto> {
    return this.accountsService.getPeriodSummary(user.companyId, user.sub, query);
  }

  @Get('income')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Income (payments received) for a period' })
  async getIncome(
    @CurrentUser() user: JwtPayload,
    @Query() query: AccountsIncomeQueryDto,
  ): Promise<PaginatedIncomeDto> {
    return this.accountsService.getIncome(user.companyId, query);
  }

  @Get('expense-breakdown')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Expense breakdown by category for a period' })
  async getExpenseBreakdown(
    @CurrentUser() user: JwtPayload,
    @Query() query: AccountsDateQueryDto,
  ): Promise<AccountsExpenseBreakdownDto> {
    return this.accountsService.getExpenseBreakdown(user.companyId, query);
  }

  @Get('staff-payments')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Staff salary and payment tracking' })
  async getStaffPayments(
    @CurrentUser() user: JwtPayload,
    @Query() query: AccountsExpensesQueryDto,
  ): Promise<PaginatedStaffPaymentsDto> {
    return this.accountsService.getStaffPayments(user.companyId, query);
  }

  @Get('profit-loss')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Profit and loss for a period' })
  async getProfitLoss(
    @CurrentUser() user: JwtPayload,
    @Query() query: AccountsDateQueryDto,
  ): Promise<ProfitLossDto> {
    return this.accountsService.getProfitLoss(user.companyId, user.sub, query);
  }

  @Get('monthly-summary')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Rolling monthly financial summary' })
  async getMonthlySummary(
    @CurrentUser() user: JwtPayload,
    @Query() query: AccountsMonthlySummaryQueryDto,
  ): Promise<MonthlyFinancialRowDto[]> {
    return this.accountsService.getMonthlyFinancialSummary(user.companyId, query);
  }

  @Get('transactions')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Unified transaction history with filters' })
  async getTransactions(
    @CurrentUser() user: JwtPayload,
    @Query() query: AccountsTransactionsQueryDto,
  ): Promise<PaginatedAccountTransactionsDto> {
    return this.accountsService.getTransactions(user.companyId, query);
  }

  @Get('monthly-report')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Monthly financial report' })
  async getMonthlyReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: MonthlyReportQueryDto,
  ): Promise<MonthlyReportDto> {
    return this.accountsService.getMonthlyReport(user.companyId, query);
  }

  @Get('booking-profit/:bookingId')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Booking profitability details' })
  async getBookingProfit(
    @CurrentUser() user: JwtPayload,
    @Param('bookingId') bookingId: string,
  ): Promise<BookingProfitabilityDto> {
    return this.accountsService.getBookingProfitability(user.companyId, bookingId);
  }
}

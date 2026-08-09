import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import {
  AccountsDashboardDto,
  AccountTransactionDto,
  BookingProfitabilityDto,
  MonthlyReportDto,
  MonthlyReportQueryDto,
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
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Accounts dashboard summary' })
  async getDashboard(@CurrentUser() user: JwtPayload): Promise<AccountsDashboardDto> {
    return this.accountsService.getDashboard(user.companyId, user.sub);
  }

  @Get('transactions')
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Unified transaction history' })
  async getTransactions(@CurrentUser() user: JwtPayload): Promise<AccountTransactionDto[]> {
    return this.accountsService.getTransactions(user.companyId);
  }

  @Get('monthly-report')
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Monthly financial report' })
  async getMonthlyReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: MonthlyReportQueryDto,
  ): Promise<MonthlyReportDto> {
    return this.accountsService.getMonthlyReport(user.companyId, query);
  }

  @Get('booking-profit/:bookingId')
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Booking profitability details' })
  async getBookingProfit(
    @CurrentUser() user: JwtPayload,
    @Param('bookingId') bookingId: string,
  ): Promise<BookingProfitabilityDto> {
    return this.accountsService.getBookingProfitability(user.companyId, bookingId);
  }
}

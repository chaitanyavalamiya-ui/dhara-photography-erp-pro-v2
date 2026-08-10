import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PaymentsModule } from '../payments/payments.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [PaymentsModule, AccountsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

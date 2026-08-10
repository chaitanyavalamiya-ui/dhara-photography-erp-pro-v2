import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { BookingsModule } from './bookings/bookings.module';
import { SettingsModule } from './settings/settings.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AccountsModule } from './accounts/accounts.module';
import { GalleriesModule } from './galleries/galleries.module';
import { AlbumsModule } from './albums/albums.module';
import { ReportsModule } from './reports/reports.module';
import { StorageModule } from './storage/storage.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../../.env'),
        resolve(__dirname, '../../../.env'),
      ],
    }),
    PrismaModule,
    StorageModule,
    AuditModule,
    HealthModule,
    AuthModule,
    ClientsModule,
    BookingsModule,
    SettingsModule,
    InvoicesModule,
    PaymentsModule,
    ExpensesModule,
    AccountsModule,
    GalleriesModule,
    AlbumsModule,
    ReportsModule,
  ],
})
export class AppModule {}

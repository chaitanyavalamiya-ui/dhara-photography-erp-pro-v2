import { Module } from '@nestjs/common';
import { RoboController } from './robo.controller';
import { RoboService } from './robo.service';
import { RoboToolsService } from './robo-tools.service';
import { AiProviderFactory } from './ai/ai-provider.factory';
import { GeminiAiProvider } from './ai/gemini.provider';
import { LocalErpAiProvider } from './ai/local-erp.provider';
import { BookingsModule } from '../bookings/bookings.module';
import { ClientsModule } from '../clients/clients.module';
import { AccountsModule } from '../accounts/accounts.module';
import { ReportsModule } from '../reports/reports.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { GalleriesModule } from '../galleries/galleries.module';
import { AlbumsModule } from '../albums/albums.module';

@Module({
  imports: [
    BookingsModule,
    ClientsModule,
    AccountsModule,
    ReportsModule,
    InvoicesModule,
    GalleriesModule,
    AlbumsModule,
  ],
  controllers: [RoboController],
  providers: [
    RoboService,
    RoboToolsService,
    AiProviderFactory,
    GeminiAiProvider,
    LocalErpAiProvider,
  ],
})
export class RoboModule {}

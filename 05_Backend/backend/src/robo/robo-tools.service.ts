import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BookingsService } from '../bookings/bookings.service';
import { ClientsService } from '../clients/clients.service';
import { AccountsService } from '../accounts/accounts.service';
import { ReportsService } from '../reports/reports.service';
import { InvoicesService } from '../invoices/invoices.service';
import { GalleriesService } from '../galleries/galleries.service';
import { AlbumsService } from '../albums/albums.service';
import { isRoboToolName, ROBO_TOOL_PERMISSIONS, RoboToolName } from './robo-tools.catalog';
import { resolveRoboDateRange } from './utils/robo-dates';

export interface RoboToolCall {
  name: string;
  args?: Record<string, unknown>;
}

@Injectable()
export class RoboToolsService {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly clientsService: ClientsService,
    private readonly accountsService: AccountsService,
    private readonly reportsService: ReportsService,
    private readonly invoicesService: InvoicesService,
    private readonly galleriesService: GalleriesService,
    private readonly albumsService: AlbumsService,
  ) {}

  assertAllowed(name: string, permissions: string[]): asserts name is RoboToolName {
    if (!isRoboToolName(name)) {
      throw new ForbiddenException(`Unknown Robo tool: ${name}`);
    }
    const required = ROBO_TOOL_PERMISSIONS[name];
    if (!permissions.includes(required)) {
      throw new ForbiddenException(`Not permitted to use ${name}.`);
    }
  }

  async execute(user: JwtPayload, call: RoboToolCall): Promise<unknown> {
    this.assertAllowed(call.name, user.permissions);
    const args = call.args ?? {};

    switch (call.name) {
      case 'get_today_bookings': {
        const range = resolveRoboDateRange('today');
        return this.bookingsService.getCalendar(user.companyId, range);
      }
      case 'get_bookings_for_range': {
        const dateFrom = String(args.dateFrom ?? '');
        const dateTo = String(args.dateTo ?? dateFrom);
        return this.bookingsService.findAll(user.companyId, {
          page: 1,
          limit: 40,
          dateFrom,
          dateTo,
          status: 'all',
        });
      }
      case 'get_accounts_dashboard':
        return this.accountsService.getDashboard(user.companyId, user.sub);
      case 'get_period_summary':
        return this.accountsService.getPeriodSummary(user.companyId, user.sub, {
          preset: (args.preset as 'this_month') ?? 'this_month',
        });
      case 'get_reports_dashboard':
        return this.reportsService.getDashboard(user.companyId, user.sub, {
          preset: (args.preset as 'this_month') ?? 'this_month',
        });
      case 'search_clients':
        return this.clientsService.findAll(user.companyId, {
          page: 1,
          limit: 10,
          search: String(args.search ?? ''),
          status: 'active',
        });
      case 'get_upcoming_events':
        return this.clientsService.getUpcomingEvents(user.companyId);
      case 'list_invoices':
        return this.invoicesService.findAll(user.companyId, { page: 1, limit: 10, status: 'all' });
      case 'list_galleries':
        return this.galleriesService.findAll(user.companyId, { page: 1, limit: 10 });
      case 'list_albums':
        return this.albumsService.findAll(user.companyId, { page: 1, limit: 10 });
      default:
        throw new ForbiddenException(`Unknown Robo tool: ${call.name}`);
    }
  }
}

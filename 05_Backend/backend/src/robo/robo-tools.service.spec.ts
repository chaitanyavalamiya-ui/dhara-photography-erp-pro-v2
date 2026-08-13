import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RoboToolsService } from './robo-tools.service';
import { BookingsService } from '../bookings/bookings.service';
import { ClientsService } from '../clients/clients.service';
import { AccountsService } from '../accounts/accounts.service';
import { ReportsService } from '../reports/reports.service';
import { InvoicesService } from '../invoices/invoices.service';
import { GalleriesService } from '../galleries/galleries.service';
import { AlbumsService } from '../albums/albums.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('RoboToolsService', () => {
  let service: RoboToolsService;
  const bookings = { getCalendar: jest.fn(), findAll: jest.fn() };
  const clients = { findAll: jest.fn(), getUpcomingEvents: jest.fn() };
  const accounts = { getDashboard: jest.fn(), getPeriodSummary: jest.fn() };
  const reports = { getDashboard: jest.fn() };
  const invoices = { findAll: jest.fn() };
  const galleries = { findAll: jest.fn() };
  const albums = { findAll: jest.fn() };

  const user = (permissions: string[]): JwtPayload => ({
    sub: 'user-1',
    email: 'a@example.com',
    companyId: 'company-1',
    permissions,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RoboToolsService,
        { provide: BookingsService, useValue: bookings },
        { provide: ClientsService, useValue: clients },
        { provide: AccountsService, useValue: accounts },
        { provide: ReportsService, useValue: reports },
        { provide: InvoicesService, useValue: invoices },
        { provide: GalleriesService, useValue: galleries },
        { provide: AlbumsService, useValue: albums },
      ],
    }).compile();
    service = module.get(RoboToolsService);
  });

  it('rejects unknown tools', async () => {
    await expect(service.execute(user(['bookings.read']), { name: 'drop_database' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects tools without permission', async () => {
    await expect(service.execute(user([]), { name: 'get_today_bookings' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(bookings.getCalendar).not.toHaveBeenCalled();
  });

  it('scopes bookings to the authenticated company', async () => {
    bookings.getCalendar.mockResolvedValue([]);
    await service.execute(user(['bookings.read']), { name: 'get_today_bookings' });
    expect(bookings.getCalendar).toHaveBeenCalledWith('company-1', expect.any(Object));
  });

  it('does not call another company id', async () => {
    bookings.findAll.mockResolvedValue({ items: [], total: 0 });
    await service.execute(user(['bookings.read']), {
      name: 'get_bookings_for_range',
      args: { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
    });
    expect(bookings.findAll).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({ dateFrom: '2026-08-01', dateTo: '2026-08-31' }),
    );
    expect(bookings.findAll.mock.calls[0][0]).not.toBe('company-2');
  });
});

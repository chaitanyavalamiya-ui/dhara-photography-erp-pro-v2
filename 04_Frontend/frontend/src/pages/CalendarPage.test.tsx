import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarPage } from './CalendarPage';
import { bookingsService } from '@/services/bookings-service';
import { clientsService } from '@/services/clients-service';
import { useAuthStore } from '@/stores/auth-store';
import { getVisibleCalendarRange } from '@/utils/calendar';

vi.mock('@/services/bookings-service', () => ({
  bookingsService: {
    getCalendar: vi.fn(),
    list: vi.fn(),
    getById: vi.fn(),
    getServiceRates: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/services/clients-service', () => ({
  clientsService: {
    list: vi.fn(),
  },
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CalendarPage />
    </QueryClientProvider>,
  );
}

const emptyClients = {
  items: [],
  total: 0,
  page: 1,
  limit: 100,
  totalPages: 1,
};

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'admin@example.com',
        companyId: 'c1',
        permissions: ['bookings.read', 'bookings.create', 'bookings.update', 'clients.read'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
    vi.mocked(bookingsService.getCalendar).mockResolvedValue([]);
    vi.mocked(bookingsService.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 8,
      totalPages: 1,
    } as never);
    vi.mocked(bookingsService.getServiceRates).mockResolvedValue([]);
    vi.mocked(clientsService.list).mockResolvedValue(emptyClients);
  });

  it('opens on the current month and year', async () => {
    const now = new Date();
    const monthName = now.toLocaleDateString('en-IN', { month: 'long' });
    renderPage();
    expect(await screen.findByText(new RegExp(`${monthName} ${now.getFullYear()}`))).toBeInTheDocument();
    expect(screen.getByLabelText('Month')).toHaveValue(String(now.getMonth()));
    expect(screen.getByLabelText('Year')).toHaveValue(String(now.getFullYear()));
  });

  it('lets the user pick a month and year directly', async () => {
    renderPage();
    await screen.findByLabelText('Month');

    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2028' } });
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2' } });

    expect(await screen.findByText('March 2028')).toBeInTheDocument();
    expect(screen.getByLabelText('Month')).toHaveValue('2');
    expect(screen.getByLabelText('Year')).toHaveValue('2028');
    await waitFor(() => {
      expect(bookingsService.getCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: getVisibleCalendarRange(2028, 2).dateFrom,
          dateTo: getVisibleCalendarRange(2028, 2).dateTo,
        }),
      );
    });
  });

  it('moves from December to January of the next year', async () => {
    renderPage();
    await screen.findByLabelText('Month');
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '11' } });
    expect(await screen.findByText('December 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Next month'));
    expect(await screen.findByText('January 2027')).toBeInTheDocument();
    expect(screen.getByLabelText('Month')).toHaveValue('0');
    expect(screen.getByLabelText('Year')).toHaveValue('2027');
  });

  it('moves from January to December of the previous year', async () => {
    renderPage();
    await screen.findByLabelText('Month');
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2027' } });
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '0' } });
    expect(await screen.findByText('January 2027')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Previous month'));
    expect(await screen.findByText('December 2026')).toBeInTheDocument();
  });

  it('returns to the current month and year with Today', async () => {
    const now = new Date();
    const monthName = now.toLocaleDateString('en-IN', { month: 'long' });
    renderPage();
    await screen.findByLabelText('Month');
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2025' } });
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '0' } });
    expect(await screen.findByText('January 2025')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(await screen.findByText(new RegExp(`${monthName} ${now.getFullYear()}`))).toBeInTheDocument();
  });

  it('loads bookings for a future year and spillover dates', async () => {
    const range = getVisibleCalendarRange(2029, 7);
    vi.mocked(bookingsService.getCalendar).mockResolvedValue([
      {
        id: 'spill',
        bookingNumber: 'BK-000010',
        clientName: 'Spill Client',
        eventType: 'Wedding',
        eventDate: `${range.dateFrom}T00:00:00.000Z`,
        eventEndDate: null,
        status: 'Confirmed',
        statusCode: 'confirmed',
        totalAmount: 10000,
        balanceAmount: 0,
      },
    ] as never);

    renderPage();
    await screen.findByLabelText('Month');
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2029' } });
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '7' } });

    expect(await screen.findByText('August 2029')).toBeInTheDocument();
    expect(await screen.findByLabelText('Booked')).toBeInTheDocument();
    expect(screen.getByText('Spill Client')).toBeInTheDocument();
  });

  it('shows heart and ring for occupying wedding dates and hides cancelled occupancy', async () => {
    vi.mocked(bookingsService.getCalendar).mockResolvedValue([
      {
        id: 'wedding',
        bookingNumber: 'BK-000001',
        clientName: 'Wedding Client',
        eventType: 'Wedding',
        eventDate: '2026-08-15T00:00:00.000Z',
        eventEndDate: null,
        status: 'Confirmed',
        statusCode: 'confirmed',
        totalAmount: 20000,
        balanceAmount: 5000,
      },
      {
        id: 'cancelled',
        bookingNumber: 'BK-000002',
        clientName: 'Cancelled Client',
        eventType: 'Birthday',
        eventDate: '2026-08-16T00:00:00.000Z',
        eventEndDate: null,
        status: 'Cancelled',
        statusCode: 'cancelled',
        totalAmount: 8000,
        balanceAmount: 8000,
      },
    ] as never);

    renderPage();
    await screen.findByLabelText('Month');
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '7' } });

    expect(await screen.findByText('Wedding Client')).toBeInTheDocument();
    expect(screen.getByLabelText('Booked')).toBeInTheDocument();
    expect(screen.getByLabelText('Wedding')).toBeInTheDocument();
    expect(screen.queryByText('Cancelled Client')).not.toBeInTheDocument();
  });

  it('shows a multi-day booking name once and keeps occupancy on each shoot day', async () => {
    vi.mocked(bookingsService.getCalendar).mockResolvedValue([
      {
        id: 'multi',
        bookingNumber: 'BK-000003',
        clientName: 'Multi Day Client',
        eventType: 'Wedding',
        eventDate: '2026-08-15T00:00:00.000Z',
        eventEndDate: '2026-08-18T00:00:00.000Z',
        status: 'Confirmed',
        statusCode: 'confirmed',
        totalAmount: 50000,
        balanceAmount: 10000,
      },
    ] as never);

    renderPage();
    await screen.findByLabelText('Month');
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '7' } });

    expect(await screen.findByText('Multi Day Client')).toBeInTheDocument();
    expect(screen.getAllByText('Multi Day Client')).toHaveLength(1);
    expect(screen.getAllByLabelText('Booked').length).toBeGreaterThanOrEqual(4);
  });

  it('shows birthday, anniversary, and booking indicators together', async () => {
    vi.mocked(bookingsService.getCalendar).mockResolvedValue([
      {
        id: 'open',
        bookingNumber: 'BK-000003',
        clientName: 'Booking Client',
        eventType: 'Wedding',
        eventDate: '2026-08-20T00:00:00.000Z',
        eventEndDate: null,
        status: 'Confirmed',
        statusCode: 'confirmed',
        totalAmount: 12000,
        balanceAmount: 2000,
      },
    ] as never);
    vi.mocked(clientsService.list).mockResolvedValue({
      ...emptyClients,
      items: [
        {
          id: 'c1',
          clientNumber: 'CLT-000001',
          fullName: 'Asha Patel',
          mobile: '9876543210',
          status: 'Active',
          isActive: true,
          dateOfBirth: '1994-08-20',
          anniversaryDate: '2018-08-20',
          totalBookings: 1,
          totalAmount: 0,
          outstandingBalance: 0,
          createdAt: '',
          updatedAt: '',
        },
      ],
      total: 1,
    });

    renderPage();
    await screen.findByLabelText('Month');
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '7' } });

    expect(await screen.findByLabelText('Booked')).toBeInTheDocument();
    expect(screen.getByLabelText('Wedding')).toBeInTheDocument();
    expect(screen.getByLabelText('Birthday')).toBeInTheDocument();
    expect(screen.getByLabelText('Anniversary')).toBeInTheDocument();

    fireEvent.click(screen.getByText('20'));
    expect(screen.getAllByText('Booking Client').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Asha Patel')).toHaveLength(2);
    expect(screen.getByText('Birthday')).toBeInTheDocument();
    expect(screen.getByText('Anniversary')).toBeInTheDocument();
  });
});

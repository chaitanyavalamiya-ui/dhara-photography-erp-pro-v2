import { apiClient, ApiResponse } from './api-client';
import type { BookingTeamMember } from './staff-service';

export interface ServiceRate {
  id: string;
  code: string;
  name: string;
  category: string;
  defaultRate: number;
  unit: 'day' | 'piece';
  sortOrder: number;
}

export interface BookingItem {
  id?: string;
  serviceRateId?: string;
  serviceName: string;
  quantity: number;
  unit: 'day' | 'piece';
  rate: number;
  days: number;
  amount: number;
  notes?: string;
}

export interface BookingClientSummary {
  id: string;
  fullName: string;
  mobile: string;
  email?: string | null;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  clientId: string;
  client: BookingClientSummary;
  eventType: string;
  eventDate?: string | null;
  eventEndDate?: string | null;
  venue?: string | null;
  city?: string | null;
  notes?: string | null;
  status: string;
  statusCode: string;
  items: BookingItem[];
  servicesSummary: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  team?: BookingTeamMember[];
}

export interface BookingFormData {
  clientId: string;
  eventType: string;
  eventDate: string;
  eventEndDate?: string;
  venue?: string;
  city?: string;
  notes?: string;
  statusCode?: string;
  items: BookingItem[];
  discount: number;
  advanceAmount: number;
}

export interface PaginatedBookings {
  items: Booking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CalendarBookingEvent {
  id: string;
  bookingNumber: string;
  clientName: string;
  eventType: string;
  eventDate?: string | null;
  eventEndDate?: string | null;
  status: string;
  statusCode: string;
  totalAmount: number;
  balanceAmount: number;
  venue?: string | null;
}

export type BookingSortField =
  | 'bookingNumber'
  | 'eventDate'
  | 'eventType'
  | 'totalAmount'
  | 'balanceAmount'
  | 'createdAt'
  | 'clientName';

export interface ListBookingsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: BookingSortField;
  sortOrder?: 'asc' | 'desc';
}

export const BOOKING_EVENT_TYPES = [
  'Wedding',
  'Pre-wedding',
  'Engagement',
  'Birthday',
  'Baby Shower',
  'Couple Photography',
  'Other',
] as const;

export const BOOKING_STATUS_OPTIONS = [
  { value: 'enquiry', label: 'Enquiry' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

function sanitizeBookingPayload<T extends BookingFormData | Partial<BookingFormData>>(payload: T): T {
  const sanitized = { ...payload };
  if (sanitized.eventEndDate === '') {
    delete sanitized.eventEndDate;
  }
  if (sanitized.venue === '') {
    delete sanitized.venue;
  }
  if (sanitized.city === '') {
    delete sanitized.city;
  }
  if (sanitized.notes === '') {
    delete sanitized.notes;
  }
  if (sanitized.items) {
    sanitized.items = sanitized.items.map(({ id: _id, ...item }) => item) as T['items'];
  }
  return sanitized;
}

export const bookingsService = {
  async list(params: ListBookingsParams = {}): Promise<PaginatedBookings> {
    const { data } = await apiClient.get<ApiResponse<PaginatedBookings>>('/bookings', { params });
    return data.data;
  },

  async getById(id: string): Promise<Booking> {
    const { data } = await apiClient.get<ApiResponse<Booking>>(`/bookings/${id}`);
    return data.data;
  },

  async getServiceRates(): Promise<ServiceRate[]> {
    const { data } = await apiClient.get<ApiResponse<ServiceRate[]>>('/bookings/service-rates');
    return data.data;
  },

  async getCalendar(params?: { dateFrom?: string; dateTo?: string }): Promise<CalendarBookingEvent[]> {
    const { data } = await apiClient.get<ApiResponse<CalendarBookingEvent[]>>('/bookings/calendar', {
      params,
    });
    return data.data;
  },

  async create(payload: BookingFormData): Promise<Booking> {
    const { data } = await apiClient.post<ApiResponse<Booking>>(
      '/bookings',
      sanitizeBookingPayload(payload),
    );
    return data.data;
  },

  async update(id: string, payload: Partial<BookingFormData>): Promise<Booking> {
    const { data } = await apiClient.patch<ApiResponse<Booking>>(
      `/bookings/${id}`,
      sanitizeBookingPayload(payload),
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/bookings/${id}`);
  },
};

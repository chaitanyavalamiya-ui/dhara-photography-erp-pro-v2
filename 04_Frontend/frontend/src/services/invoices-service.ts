import { apiClient, ApiResponse } from './api-client';

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface InvoiceClient {
  id: string;
  fullName: string;
  mobile: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
}

export interface InvoiceBookingItem {
  id: string;
  serviceName: string;
  quantity: number;
  unit: string;
  rate: number;
  days: number;
  amount: number;
}

export interface InvoiceBooking {
  id: string;
  bookingNumber: string;
  eventType: string;
  eventDate?: string | null;
  eventEndDate?: string | null;
  venue?: string | null;
  city?: string | null;
  notes?: string | null;
  items: InvoiceBookingItem[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  clientId: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  client: InvoiceClient;
  booking: InvoiceBooking;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  bookingNumber: string;
  clientId: string;
  clientName: string;
  clientMobile: string;
  eventType: string;
  eventDate?: string | null;
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate?: string | null;
  createdAt: string;
}

export interface PaginatedInvoices {
  items: InvoiceListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListInvoicesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvoiceStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'invoiceNumber' | 'invoiceDate' | 'totalAmount' | 'outstandingAmount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateInvoicePayload {
  bookingId: string;
  dueDate?: string;
  notes?: string;
}

export interface UpdateInvoicePayload {
  dueDate?: string | null;
  notes?: string | null;
  advanceAmount?: number;
}

export const INVOICE_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
] as const;

export const invoicesService = {
  async list(params: ListInvoicesParams = {}): Promise<PaginatedInvoices> {
    const { data } = await apiClient.get<ApiResponse<PaginatedInvoices>>('/invoices', { params });
    return data.data;
  },

  async getById(id: string): Promise<Invoice> {
    const { data } = await apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`);
    return data.data;
  },

  async create(payload: CreateInvoicePayload): Promise<Invoice> {
    const { data } = await apiClient.post<ApiResponse<Invoice>>('/invoices', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateInvoicePayload): Promise<Invoice> {
    const { data } = await apiClient.patch<ApiResponse<Invoice>>(`/invoices/${id}`, payload);
    return data.data;
  },

  async archive(id: string): Promise<void> {
    await apiClient.delete(`/invoices/${id}`);
  },
};

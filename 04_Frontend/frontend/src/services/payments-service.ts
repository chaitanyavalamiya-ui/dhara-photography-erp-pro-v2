import { apiClient, ApiResponse } from './api-client';

export interface Payment {
  id: string;
  receiptNumber?: string | null;
  invoiceId: string;
  invoiceNumber: string;
  bookingId: string;
  bookingNumber: string;
  clientId: string;
  clientName: string;
  clientMobile: string;
  amount: number;
  paymentDate: string;
  paymentModeCode: string;
  paymentModeLabel: string;
  transactionReference?: string | null;
  notes?: string | null;
  previousBalance?: number;
  remainingBalance?: number;
  createdAt: string;
  isVoided?: boolean;
  voidedAt?: string | null;
}

export interface PaginatedPayments {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePaymentPayload {
  invoiceId: string;
  amount: number;
  paymentModeCode: string;
  paymentDate?: string;
  transactionReference?: string;
  notes?: string;
}

export interface UpdatePaymentPayload {
  amount?: number;
  paymentModeCode?: string;
  paymentDate?: string;
  transactionReference?: string | null;
  notes?: string | null;
}

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
] as const;

export const paymentsService = {
  async list(params: Record<string, unknown> = {}): Promise<PaginatedPayments> {
    const { data } = await apiClient.get<ApiResponse<PaginatedPayments>>('/payments', { params });
    return data.data;
  },

  async getById(id: string): Promise<Payment> {
    const { data } = await apiClient.get<ApiResponse<Payment>>(`/payments/${id}`);
    return data.data;
  },

  async create(payload: CreatePaymentPayload): Promise<Payment> {
    const { data } = await apiClient.post<ApiResponse<Payment>>('/payments', payload);
    return data.data;
  },

  async update(id: string, payload: UpdatePaymentPayload): Promise<Payment> {
    const { data } = await apiClient.patch<ApiResponse<Payment>>(`/payments/${id}`, payload);
    return data.data;
  },

  async void(id: string): Promise<Payment> {
    const { data } = await apiClient.post<ApiResponse<Payment>>(`/payments/${id}/void`);
    return data.data;
  },
};

import { apiClient, ApiResponse } from './api-client';

export interface Expense {
  id: string;
  categoryCode: string;
  categoryLabel: string;
  amount: number;
  expenseDate: string;
  description?: string | null;
  vendorPerson?: string | null;
  paymentModeCode?: string | null;
  paymentModeLabel?: string | null;
  referenceNumber?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  bookingId?: string | null;
  bookingNumber?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  staffId?: string | null;
  staffName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface PaginatedExpenses {
  items: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateExpensePayload {
  categoryCode: string;
  amount: number;
  expenseDate: string;
  description?: string;
  vendorPerson?: string;
  paymentModeCode?: string;
  referenceNumber?: string;
  clientId?: string;
  bookingId?: string;
  invoiceId?: string;
  notes?: string;
}

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'album_printing', label: 'Album Printing' },
  { value: 'printing', label: 'Printing' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'venue', label: 'Venue' },
  { value: 'drone', label: 'Drone' },
  { value: 'camera_rental', label: 'Camera/Equipment Rental' },
  { value: 'editing', label: 'Editing' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'internet', label: 'Internet' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
] as const;

export const expensesService = {
  async list(params: Record<string, unknown> = {}): Promise<PaginatedExpenses> {
    const { data } = await apiClient.get<ApiResponse<PaginatedExpenses>>('/expenses', { params });
    return data.data;
  },

  async create(payload: CreateExpensePayload): Promise<Expense> {
    const { data } = await apiClient.post<ApiResponse<Expense>>('/expenses', payload);
    return data.data;
  },
};

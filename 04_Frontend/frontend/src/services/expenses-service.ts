import { apiClient, ApiResponse } from './api-client';

export type ExpenseSource = 'manual' | 'booking_staff_sync' | 'album_sync';

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

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

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

export function getExpenseSource(
  expense: Pick<Expense, 'notes' | 'description' | 'categoryCode'>,
): ExpenseSource {
  const notes = expense.notes ?? '';

  if (notes.startsWith('Linked to booking staff assignment')) {
    return 'booking_staff_sync';
  }

  if (notes.startsWith('Linked to album')) {
    return 'album_sync';
  }

  if (
    expense.categoryCode === 'staff' &&
    expense.description?.toLowerCase().includes(' payment:')
  ) {
    return 'booking_staff_sync';
  }

  if (expense.categoryCode === 'album_printing' && expense.description?.startsWith('Album printing:')) {
    return 'album_sync';
  }

  return 'manual';
}

export function isSystemLinkedExpense(expense: Expense): boolean {
  return getExpenseSource(expense) !== 'manual';
}

export function getExpenseSourceLabel(source: ExpenseSource): string {
  switch (source) {
    case 'booking_staff_sync':
      return 'Booking Staff Sync';
    case 'album_sync':
      return 'Album Vendor Sync';
    default:
      return 'Manual Entry';
  }
}

export function getExpenseSourceDescription(source: ExpenseSource): string | null {
  switch (source) {
    case 'booking_staff_sync':
      return 'This expense is managed automatically from booking team assignments or staff payments. Edit it from the booking Team or Payments tab.';
    case 'album_sync':
      return 'This expense is managed automatically from album vendor costs. Edit it from the album record.';
    default:
      return null;
  }
}

export const expensesService = {
  async list(params: Record<string, unknown> = {}): Promise<PaginatedExpenses> {
    const { data } = await apiClient.get<ApiResponse<PaginatedExpenses>>('/expenses', { params });
    return data.data;
  },

  async getById(id: string): Promise<Expense> {
    const { data } = await apiClient.get<ApiResponse<Expense>>(`/expenses/${id}`);
    return data.data;
  },

  async create(payload: CreateExpensePayload): Promise<Expense> {
    const { data } = await apiClient.post<ApiResponse<Expense>>('/expenses', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateExpensePayload): Promise<Expense> {
    const { data } = await apiClient.patch<ApiResponse<Expense>>(`/expenses/${id}`, payload);
    return data.data;
  },

  async archive(id: string): Promise<void> {
    await apiClient.delete(`/expenses/${id}`);
  },
};

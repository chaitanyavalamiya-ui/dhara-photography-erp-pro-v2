import { apiClient, ApiResponse } from './api-client';

export interface StaffMember {
  id: string;
  staffCode: string;
  fullName: string;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  role: string;
  roleLabel: string;
  joiningDate?: string | null;
  paymentType: string;
  paymentTypeLabel: string;
  defaultRate: number;
  notes?: string | null;
  isActive: boolean;
  totalAssignments: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAssignmentSummary {
  id: string;
  bookingId: string;
  bookingNumber: string;
  eventType: string;
  eventDate?: string | null;
  role: string;
  roleLabel: string;
  assignmentDate?: string | null;
  agreedRate?: number | null;
  notes?: string | null;
}

export interface StaffExpenseSummary {
  id: string;
  amount: number;
  expenseDate: string;
  description?: string | null;
  bookingId?: string | null;
  bookingNumber?: string | null;
}

export interface StaffDetail extends StaffMember {
  upcomingBookings: StaffAssignmentSummary[];
  recentCompletedBookings: StaffAssignmentSummary[];
  recentExpenses: StaffExpenseSummary[];
  totalExpenseAmount: number;
}

export interface StaffFormData {
  fullName: string;
  mobile?: string;
  email?: string;
  address?: string;
  role: string;
  joiningDate?: string;
  paymentType?: string;
  defaultRate?: number;
  notes?: string;
  isActive?: boolean;
}

export interface PaginatedStaff {
  items: StaffMember[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type StaffSortField =
  | 'fullName'
  | 'staffCode'
  | 'role'
  | 'mobile'
  | 'joiningDate'
  | 'createdAt';

export interface ListStaffParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  role?: string;
  sortBy?: StaffSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface BookingTeamMember {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  role: string;
  roleLabel: string;
  assignmentDate?: string | null;
  agreedRate?: number | null;
  notes?: string | null;
  expenseId?: string | null;
}

export interface AssignBookingStaffData {
  staffId: string;
  role: string;
  assignmentDate?: string;
  agreedRate?: number;
  notes?: string;
  syncExpense?: boolean;
}

export interface UpdateBookingStaffData {
  staffId?: string;
  role?: string;
  assignmentDate?: string;
  agreedRate?: number;
  notes?: string;
  syncExpense?: boolean;
}

export const staffService = {
  async list(params: ListStaffParams = {}): Promise<PaginatedStaff> {
    const { data } = await apiClient.get<ApiResponse<PaginatedStaff>>('/staff', { params });
    return data.data;
  },

  async getById(id: string): Promise<StaffDetail> {
    const { data } = await apiClient.get<ApiResponse<StaffDetail>>(`/staff/${id}`);
    return data.data;
  },

  async create(payload: StaffFormData): Promise<StaffMember> {
    const { data } = await apiClient.post<ApiResponse<StaffMember>>('/staff', payload);
    return data.data;
  },

  async update(id: string, payload: Partial<StaffFormData>): Promise<StaffMember> {
    const { data } = await apiClient.patch<ApiResponse<StaffMember>>(`/staff/${id}`, payload);
    return data.data;
  },

  async archive(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete<ApiResponse<{ message: string }>>(`/staff/${id}`);
    return data.data;
  },

  async listBookingTeam(bookingId: string): Promise<BookingTeamMember[]> {
    const { data } = await apiClient.get<ApiResponse<BookingTeamMember[]>>(
      `/bookings/${bookingId}/staff`,
    );
    return data.data;
  },

  async assignToBooking(
    bookingId: string,
    payload: AssignBookingStaffData,
  ): Promise<BookingTeamMember> {
    const { data } = await apiClient.post<ApiResponse<BookingTeamMember>>(
      `/bookings/${bookingId}/staff`,
      payload,
    );
    return data.data;
  },

  async updateBookingAssignment(
    bookingId: string,
    assignmentId: string,
    payload: UpdateBookingStaffData,
  ): Promise<BookingTeamMember> {
    const { data } = await apiClient.patch<ApiResponse<BookingTeamMember>>(
      `/bookings/${bookingId}/staff/${assignmentId}`,
      payload,
    );
    return data.data;
  },

  async removeBookingAssignment(
    bookingId: string,
    assignmentId: string,
  ): Promise<{ message: string }> {
    const { data } = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/bookings/${bookingId}/staff/${assignmentId}`,
    );
    return data.data;
  },
};

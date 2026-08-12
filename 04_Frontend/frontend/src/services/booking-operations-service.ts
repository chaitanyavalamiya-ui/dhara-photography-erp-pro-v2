import { apiClient, ApiResponse } from './api-client';

export interface BookingStaffPayment {
  id: string;
  bookingStaffId: string;
  staffName: string;
  staffCode: string;
  role: string;
  roleLabel: string;
  amount: number;
  status: 'pending' | 'paid';
  paymentDate?: string | null;
  paymentMode?: string | null;
  notes?: string | null;
  recordedById?: string | null;
  createdAt: string;
}

export interface BookingEquipmentItem {
  id: string;
  equipmentName: string;
  quantityIssued: number;
  quantityReturned: number;
  status: string;
  statusLabel: string;
  issuedByName?: string | null;
  issuedAt?: string | null;
  returnedAt?: string | null;
  conditionCheckout?: string | null;
  conditionReturn?: string | null;
  missingQuantity: number;
  damagedQuantity: number;
  repairQuantity: number;
  checkoutNotes?: string | null;
  returnNotes?: string | null;
}

export interface BookingProgressStage {
  stage: string;
  label: string;
  completed: boolean;
}

export interface BookingProgress {
  currentStage: string;
  currentStageLabel: string;
  stages: BookingProgressStage[];
}

export interface BookingActivity {
  id: string;
  activityType: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
  createdById?: string | null;
}

export interface BookingReminder {
  id: string;
  clientId?: string | null;
  bookingId?: string | null;
  reminderType: string;
  reminderDate: string;
  note?: string | null;
  status: string;
  completedAt?: string | null;
}

export const EVENT_PROGRESS_STAGES = [
  { value: 'booking_confirmed', label: 'Booking Confirmed' },
  { value: 'team_assigned', label: 'Team Assigned' },
  { value: 'equipment_issued', label: 'Equipment Issued' },
  { value: 'event_started', label: 'Event Started' },
  { value: 'photography_completed', label: 'Photography Completed' },
  { value: 'videography_completed', label: 'Videography Completed' },
  { value: 'editing', label: 'Editing' },
  { value: 'album_pending', label: 'Album Pending' },
  { value: 'album_completed', label: 'Album Completed' },
  { value: 'delivery_pending', label: 'Delivery Pending' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
] as const;

export const REMINDER_TYPES = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'other', label: 'Other' },
] as const;

export const bookingOperationsService = {
  async listStaffPayments(bookingId: string): Promise<BookingStaffPayment[]> {
    const { data } = await apiClient.get<ApiResponse<BookingStaffPayment[]>>(
      `/bookings/${bookingId}/staff-payments`,
    );
    return data.data;
  },

  async createStaffPayment(
    bookingId: string,
    assignmentId: string,
    payload: {
      amount: number;
      status?: string;
      paymentDate?: string;
      paymentMode?: string;
      notes?: string;
    },
  ): Promise<BookingStaffPayment> {
    const { data } = await apiClient.post<ApiResponse<BookingStaffPayment>>(
      `/bookings/${bookingId}/staff/${assignmentId}/payments`,
      payload,
    );
    return data.data;
  },

  async updateStaffPayment(
    bookingId: string,
    assignmentId: string,
    paymentId: string,
    payload: Partial<{
      amount: number;
      status: string;
      paymentDate: string;
      paymentMode: string;
      notes: string;
    }>,
  ): Promise<BookingStaffPayment> {
    const { data } = await apiClient.patch<ApiResponse<BookingStaffPayment>>(
      `/bookings/${bookingId}/staff/${assignmentId}/payments/${paymentId}`,
      payload,
    );
    return data.data;
  },

  async listEquipment(bookingId: string): Promise<BookingEquipmentItem[]> {
    const { data } = await apiClient.get<ApiResponse<BookingEquipmentItem[]>>(
      `/bookings/${bookingId}/equipment`,
    );
    return data.data;
  },

  async createEquipment(
    bookingId: string,
    payload: { equipmentName: string; quantityIssued?: number },
  ): Promise<BookingEquipmentItem> {
    const { data } = await apiClient.post<ApiResponse<BookingEquipmentItem>>(
      `/bookings/${bookingId}/equipment`,
      payload,
    );
    return data.data;
  },

  async checkoutEquipment(
    bookingId: string,
    equipmentId: string,
    payload: {
      quantityIssued: number;
      issuedByName?: string;
      conditionCheckout?: string;
      checkoutNotes?: string;
    },
  ): Promise<BookingEquipmentItem> {
    const { data } = await apiClient.patch<ApiResponse<BookingEquipmentItem>>(
      `/bookings/${bookingId}/equipment/${equipmentId}/checkout`,
      payload,
    );
    return data.data;
  },

  async returnEquipment(
    bookingId: string,
    equipmentId: string,
    payload: {
      quantityReturned: number;
      conditionReturn?: string;
      missingQuantity?: number;
      damagedQuantity?: number;
      repairQuantity?: number;
      returnNotes?: string;
    },
  ): Promise<BookingEquipmentItem> {
    const { data } = await apiClient.patch<ApiResponse<BookingEquipmentItem>>(
      `/bookings/${bookingId}/equipment/${equipmentId}/return`,
      payload,
    );
    return data.data;
  },

  async removeEquipment(bookingId: string, equipmentId: string): Promise<void> {
    await apiClient.delete(`/bookings/${bookingId}/equipment/${equipmentId}`);
  },

  async getProgress(bookingId: string): Promise<BookingProgress> {
    const { data } = await apiClient.get<ApiResponse<BookingProgress>>(
      `/bookings/${bookingId}/progress`,
    );
    return data.data;
  },

  async updateProgress(bookingId: string, stage: string): Promise<BookingProgress> {
    const { data } = await apiClient.patch<ApiResponse<BookingProgress>>(
      `/bookings/${bookingId}/progress`,
      { stage },
    );
    return data.data;
  },

  async listActivities(bookingId: string): Promise<BookingActivity[]> {
    const { data } = await apiClient.get<ApiResponse<BookingActivity[]>>(
      `/bookings/${bookingId}/activities`,
    );
    return data.data;
  },

  async listReminders(bookingId: string): Promise<BookingReminder[]> {
    const { data } = await apiClient.get<ApiResponse<BookingReminder[]>>(
      `/bookings/${bookingId}/reminders`,
    );
    return data.data;
  },

  async createReminder(
    bookingId: string,
    payload: { reminderType: string; reminderDate: string; note?: string },
  ): Promise<BookingReminder> {
    const { data } = await apiClient.post<ApiResponse<BookingReminder>>(
      `/bookings/${bookingId}/reminders`,
      payload,
    );
    return data.data;
  },

  async updateReminder(
    bookingId: string,
    reminderId: string,
    payload: Partial<{ reminderType: string; reminderDate: string; note: string; status: string }>,
  ): Promise<BookingReminder> {
    const { data } = await apiClient.patch<ApiResponse<BookingReminder>>(
      `/bookings/${bookingId}/reminders/${reminderId}`,
      payload,
    );
    return data.data;
  },
};

import apiClient from './client';
import { Appointment } from '../types';

export interface BookAppointmentPayload {
  doctor_id: number;
  start_time: string;
  end_time: string;
  reason?: string;
}

export const appointmentsApi = {
  getAll: async (): Promise<Appointment[]> => {
    const res = await apiClient.get<Appointment[]>('/appointments');
    return res.data;
  },

  book: async (payload: BookAppointmentPayload): Promise<Appointment> => {
    const res = await apiClient.post<Appointment>('/appointments', payload);
    return res.data;
  },

  cancel: async (appointmentId: number, cancellationReason: string): Promise<Appointment> => {
    const res = await apiClient.post<Appointment>(`/appointments/${appointmentId}/cancel`, {
      cancellation_reason: cancellationReason,
    });
    return res.data;
  },
};


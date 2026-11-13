import apiClient from './client';
import { WaitlistEntry } from '../types';

export interface JoinWaitlistPayload {
  doctor_id: number;
  preferred_days: string[];
  preferred_time_periods: string[];
  notes?: string;
}

export const waitlistApi = {
  getMyWaitlist: async (): Promise<WaitlistEntry[]> => {
    const res = await apiClient.get<WaitlistEntry[]>('/waitlist/my');
    return res.data;
  },

  getDoctorWaitlist: async (doctorId: number): Promise<WaitlistEntry[]> => {
    const res = await apiClient.get<WaitlistEntry[]>(`/waitlist/doctor/${doctorId}`);
    return res.data;
  },

  join: async (payload: JoinWaitlistPayload): Promise<WaitlistEntry> => {
    const res = await apiClient.post<WaitlistEntry>('/waitlist', payload);
    return res.data;
  },

  leave: async (waitlistId: number): Promise<void> => {
    await apiClient.delete(`/waitlist/${waitlistId}`);
  },
};


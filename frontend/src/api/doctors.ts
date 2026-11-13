import apiClient from './client';
import { Doctor } from '../types';

export const doctorsApi = {
  getAll: async (): Promise<Doctor[]> => {
    const res = await apiClient.get<Doctor[]>('/doctors');
    return res.data;
  },

  getById: async (id: number): Promise<Doctor> => {
    const res = await apiClient.get<Doctor>(`/doctors/${id}`);
    return res.data;
  },

  create: async (data: Partial<Doctor>): Promise<Doctor> => {
    const res = await apiClient.post<Doctor>('/doctors', data);
    return res.data;
  },
};


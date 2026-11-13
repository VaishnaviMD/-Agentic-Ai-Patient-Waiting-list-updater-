import apiClient from './client';
import { AppointmentOffer } from '../types';

export interface OfferActionResponse {
  success: boolean;
  message: string;
  offer_id: number;
  status: string;
  appointment_id?: number;
}

export const offersApi = {
  getMyActiveOffer: async (): Promise<AppointmentOffer | null> => {
    const res = await apiClient.get<AppointmentOffer | null>('/offers/my-active');
    return res.data;
  },

  getMyHistory: async (): Promise<AppointmentOffer[]> => {
    const res = await apiClient.get<AppointmentOffer[]>('/offers/my-history');
    return res.data;
  },

  accept: async (offerId: number): Promise<OfferActionResponse> => {
    const res = await apiClient.post<OfferActionResponse>(`/offers/${offerId}/accept`);
    return res.data;
  },

  decline: async (offerId: number): Promise<OfferActionResponse> => {
    const res = await apiClient.post<OfferActionResponse>(`/offers/${offerId}/decline`);
    return res.data;
  },
};


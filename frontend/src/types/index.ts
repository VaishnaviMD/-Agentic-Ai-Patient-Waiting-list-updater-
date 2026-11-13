export type UserRole = 'patient' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  created_at: string;
  patient_id?: number | null;
  doctor_id?: number | null;
}

export interface DoctorAvailability {
  id: number;
  doctor_id: number;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

export interface Doctor {
  id: number;
  full_name: string;
  specialty: string;
  room_number?: string;
  consultation_fee: number;
  is_active: boolean;
  availabilities?: DoctorAvailability[];
}

export type AppointmentStatus =
  | 'scheduled'
  | 'cancelled'
  | 'offered'
  | 'booked'
  | 'completed'
  | 'no_show';

export interface Appointment {
  id: number;
  patient_id?: number;
  patient_name?: string;
  doctor_id: number;
  doctor_name?: string;
  doctor_specialty?: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  reason?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export type WaitlistStatus = 'waiting' | 'offered' | 'booked' | 'removed';

export interface WaitlistEntry {
  id: number;
  patient_id: number;
  patient_name?: string;
  doctor_id: number;
  doctor_name?: string;
  doctor_specialty?: string;
  preferred_days: string[];
  preferred_time_periods: string[];
  status: WaitlistStatus;
  joined_at: string;
  notes?: string;
}

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'withdrawn';

export interface AppointmentOffer {
  id: number;
  appointment_id: number;
  patient_id: number;
  patient_name?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  slot_start_time?: string;
  slot_end_time?: string;
  status: OfferStatus;
  offered_at: string;
  expires_at: string;
  responded_at?: string;
  is_expired: boolean;
}

export interface DashboardStats {
  total_doctors: number;
  total_patients: number;
  total_active_appointments: number;
  total_cancellations: number;
  active_waitlist_count: number;
  active_pending_offers: number;
  total_offers_extended: number;
  offers_accepted: number;
  recovery_rate_percentage: number;
}

export interface WorkflowExecution {
  id: number;
  workflow_type: string;
  trigger_event: string;
  appointment_id?: number;
  n8n_execution_id?: string;
  status: 'running' | 'success' | 'failed' | 'escalated';
  agent_decisions: Record<string, any>;
  error_message?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  entity_name: string;
  entity_id: number;
  action: string;
  actor_type: string;
  actor_id?: number;
  details: Record<string, any>;
  timestamp: string;
}


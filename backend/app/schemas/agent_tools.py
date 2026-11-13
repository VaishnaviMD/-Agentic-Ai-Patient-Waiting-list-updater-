from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# Tool 1: Get Appointment Details
class AppointmentDetailsInput(BaseModel):
    appointment_id: int


class AppointmentDetailsOutput(BaseModel):
    id: int
    doctor_id: int
    doctor_name: str
    doctor_specialty: str
    start_time: datetime
    end_time: datetime
    day_of_week: str
    time_period: str
    status: str
    cancellation_reason: Optional[str] = None


# Tool 2: Find Eligible Patients
class EligiblePatientsInput(BaseModel):
    appointment_id: int


class EligibleCandidateItem(BaseModel):
    waitlist_id: int
    patient_id: int
    patient_name: str
    preferred_days: List[str]
    preferred_time_periods: List[str]
    joined_at: datetime
    declined_offers_count: int


class EligiblePatientsOutput(BaseModel):
    appointment_id: int
    count: int
    candidates: List[EligibleCandidateItem]


# Tool 3: Rank Candidates
class RankCandidatesInput(BaseModel):
    appointment_id: int


class RankedCandidateItem(BaseModel):
    rank: int
    waitlist_id: int
    patient_id: int
    patient_name: str
    total_score: int
    breakdown: Dict[str, int]
    explanation: str


class RankCandidatesOutput(BaseModel):
    appointment_id: int
    ranked_candidates: List[RankedCandidateItem]


# Tool 4: Create Appointment Offer
class CreateOfferInput(BaseModel):
    appointment_id: int
    patient_id: int
    waitlist_id: int
    expiry_minutes: Optional[int] = 15


class CreateOfferOutput(BaseModel):
    offer_id: int
    appointment_id: int
    patient_id: int
    patient_name: str
    status: str
    expires_at: datetime
    message: str


# Tool 5: Check Offer Status
class CheckOfferStatusInput(BaseModel):
    offer_id: int


class CheckOfferStatusOutput(BaseModel):
    offer_id: int
    appointment_id: int
    patient_id: int
    status: str
    expires_at: datetime
    is_expired: bool


# Tool 6: Book Appointment
class BookAppointmentInput(BaseModel):
    offer_id: int
    appointment_id: int
    patient_id: int


class BookAppointmentOutput(BaseModel):
    success: bool
    appointment_id: int
    patient_id: int
    status: str
    confirmation_code: str
    message: str


# Tool 7: Offer to Next Patient
class NextCandidateInput(BaseModel):
    appointment_id: int


class NextCandidateOutput(BaseModel):
    appointment_id: int
    has_next: bool
    next_candidate: Optional[RankedCandidateItem] = None
    message: str


# Tool 8: Notify Patient
class NotifyPatientInput(BaseModel):
    patient_id: int
    offer_id: Optional[int] = None
    notification_type: str = "offer_created"  # 'offer_created', 'reminder', 'booked'
    message: Optional[str] = None


class NotifyPatientOutput(BaseModel):
    success: bool
    patient_id: int
    delivery_channel: str
    status: str
    timestamp: datetime


# Tool 9: Escalate to Admin
class EscalateToAdminInput(BaseModel):
    appointment_id: int
    reason: str
    context: Optional[Dict[str, Any]] = None


class EscalateToAdminOutput(BaseModel):
    escalation_id: int
    appointment_id: int
    status: str
    message: str
    admin_notified: bool


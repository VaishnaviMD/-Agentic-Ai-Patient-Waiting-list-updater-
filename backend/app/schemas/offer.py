from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class OfferOut(BaseModel):
    id: int
    appointment_id: int
    patient_id: int
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    slot_start_time: Optional[datetime] = None
    slot_end_time: Optional[datetime] = None
    status: str
    offered_at: datetime
    expires_at: datetime
    responded_at: Optional[datetime] = None
    is_expired: bool = False

    class Config:
        from_attributes = True


class OfferActionResponse(BaseModel):
    success: bool
    message: str
    offer_id: int
    status: str
    appointment_id: Optional[int] = None


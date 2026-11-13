from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AppointmentCreate(BaseModel):
    doctor_id: int
    start_time: datetime
    end_time: datetime
    reason: Optional[str] = None


class AppointmentCancel(BaseModel):
    cancellation_reason: str = Field(..., min_length=3, description="Reason for cancelling the appointment")


class AppointmentOut(BaseModel):
    id: int
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    doctor_id: int
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: str
    reason: Optional[str] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


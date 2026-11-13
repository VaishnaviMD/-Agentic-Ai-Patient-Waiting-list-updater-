from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import time
from decimal import Decimal


class DoctorAvailabilityBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="0=Sunday, 1=Monday, ..., 6=Saturday")
    start_time: time
    end_time: time
    slot_duration_minutes: int = 30
    is_active: bool = True


class DoctorAvailabilityOut(DoctorAvailabilityBase):
    id: int
    doctor_id: int

    class Config:
        from_attributes = True


class DoctorBase(BaseModel):
    full_name: str
    specialty: str
    room_number: Optional[str] = None
    consultation_fee: Decimal = Decimal("150.00")
    is_active: bool = True


class DoctorCreate(DoctorBase):
    user_id: Optional[int] = None


class DoctorOut(DoctorBase):
    id: int
    availabilities: List[DoctorAvailabilityOut] = []

    class Config:
        from_attributes = True


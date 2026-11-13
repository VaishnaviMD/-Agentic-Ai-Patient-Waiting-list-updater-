from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class WaitlistCreate(BaseModel):
    doctor_id: int
    preferred_days: List[str] = Field(default=["Any"], description="e.g. ['Monday', 'Wednesday'] or ['Any']")
    preferred_time_periods: List[str] = Field(default=["Any"], description="e.g. ['Morning', 'Afternoon'] or ['Any']")
    notes: Optional[str] = None


class WaitlistOut(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    doctor_id: int
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    preferred_days: List[str]
    preferred_time_periods: List[str]
    status: str
    joined_at: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True


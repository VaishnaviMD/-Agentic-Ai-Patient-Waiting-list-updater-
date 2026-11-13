from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime, date


class UserRegister(BaseModel):
    """Schema for incoming user registration requests."""

    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: str = Field(..., min_length=2)
    role: Literal["patient", "admin"] = "patient"
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    emergency_contact: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for incoming authentication login requests."""

    email: EmailStr
    password: str


class UserOut(BaseModel):
    """Safe public schema for user identity representation."""

    id: int
    email: EmailStr
    full_name: str
    role: str
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for JWT authentication response."""

    access_token: str
    token_type: str = "bearer"
    user: UserOut


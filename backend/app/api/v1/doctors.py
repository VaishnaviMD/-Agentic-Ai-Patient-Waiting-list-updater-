from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.doctor import Doctor
from app.models.doctor_availability import DoctorAvailability
from app.schemas.doctor import DoctorOut, DoctorCreate, DoctorAvailabilityOut, DoctorAvailabilityBase
from app.api.deps import require_admin

router = APIRouter(prefix="/doctors", tags=["Doctors & Schedules"])


@router.get("", response_model=List[DoctorOut])
def list_doctors(db: Session = Depends(get_db)):
    """Retrieves all active medical practitioners and their weekly schedules."""
    return db.query(Doctor).filter(Doctor.is_active == True).all()


@router.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    """Retrieves detailed profile and availability for a single doctor."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    return doctor


@router.post("", response_model=DoctorOut, status_code=status.HTTP_201_CREATED)
def create_doctor(
    data: DoctorCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """(Admin) Creates a new doctor profile in the hospital directory."""
    doctor = Doctor(
        user_id=data.user_id,
        full_name=data.full_name,
        specialty=data.specialty,
        room_number=data.room_number,
        consultation_fee=data.consultation_fee,
        is_active=data.is_active,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


@router.post("/{doctor_id}/availability", response_model=DoctorAvailabilityOut, status_code=status.HTTP_201_CREATED)
def add_doctor_availability(
    doctor_id: int,
    data: DoctorAvailabilityBase,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """(Admin) Adds a recurring weekly availability window for a doctor."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    availability = DoctorAvailability(
        doctor_id=doctor_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        slot_duration_minutes=data.slot_duration_minutes,
        is_active=data.is_active,
    )
    db.add(availability)
    db.commit()
    db.refresh(availability)
    return availability


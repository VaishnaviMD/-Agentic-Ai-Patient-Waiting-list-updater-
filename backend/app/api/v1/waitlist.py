from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.waitlist import Waitlist, WaitlistStatus
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.schemas.waitlist import WaitlistOut, WaitlistCreate
from app.api.deps import get_current_user, require_admin
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/waitlist", tags=["Waitlist"])


def serialize_waitlist(w: Waitlist) -> WaitlistOut:
    patient_name = w.patient.user.full_name if w.patient and w.patient.user else None
    doctor_name = w.doctor.full_name if w.doctor else None
    doctor_specialty = w.doctor.specialty if w.doctor else None
    return WaitlistOut(
        id=w.id,
        patient_id=w.patient_id,
        patient_name=patient_name,
        doctor_id=w.doctor_id,
        doctor_name=doctor_name,
        doctor_specialty=doctor_specialty,
        preferred_days=w.preferred_days,
        preferred_time_periods=w.preferred_time_periods,
        status=w.status.value,
        joined_at=w.joined_at,
        notes=w.notes,
    )


@router.post("", response_model=WaitlistOut, status_code=status.HTTP_201_CREATED)
def join_waitlist(
    data: WaitlistCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Adds the authenticated patient to a doctor's waitlist with specific availability preferences."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No patient profile found")

    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    # Check for active waitlist entry with this doctor
    existing = (
        db.query(Waitlist)
        .filter(
            Waitlist.patient_id == patient.id,
            Waitlist.doctor_id == data.doctor_id,
            Waitlist.status == WaitlistStatus.WAITING,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already actively waiting for this doctor",
        )

    entry = Waitlist(
        patient_id=patient.id,
        doctor_id=data.doctor_id,
        preferred_days=data.preferred_days,
        preferred_time_periods=data.preferred_time_periods,
        status=WaitlistStatus.WAITING,
        notes=data.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    log_audit_event(
        db=db,
        entity_name="waitlist",
        entity_id=entry.id,
        action="CREATE",
        actor_type="PATIENT",
        actor_id=patient.id,
        details={"doctor_id": doctor.id, "days": data.preferred_days, "times": data.preferred_time_periods},
    )

    return serialize_waitlist(entry)


@router.get("/my", response_model=List[WaitlistOut])
def get_my_waitlist_entries(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all active and historical waitlist registrations for the authenticated patient."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []
    entries = db.query(Waitlist).filter(Waitlist.patient_id == patient.id).order_by(Waitlist.joined_at.desc()).all()
    return [serialize_waitlist(e) for e in entries]


@router.get("/doctor/{doctor_id}", response_model=List[WaitlistOut])
def get_doctor_waitlist(
    doctor_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """(Admin) Lists the active waitlist queue for a specific doctor."""
    entries = (
        db.query(Waitlist)
        .filter(
            Waitlist.doctor_id == doctor_id,
            Waitlist.status == WaitlistStatus.WAITING,
        )
        .order_by(Waitlist.joined_at.asc())
        .all()
    )
    return [serialize_waitlist(e) for e in entries]


@router.delete("/{waitlist_id}")
def leave_waitlist(
    waitlist_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Removes a patient from an active waitlist."""
    entry = db.query(Waitlist).filter(Waitlist.id == waitlist_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist entry not found")

    if current_user.role != "admin":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or entry.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    entry.status = WaitlistStatus.REMOVED
    db.commit()
    return {"message": "Successfully removed from waitlist", "waitlist_id": waitlist_id}


from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.schemas.appointment import AppointmentOut, AppointmentCreate, AppointmentCancel
from app.api.deps import get_current_user
from app.services.audit_service import log_audit_event
from app.services.webhook_service import trigger_n8n_webhook

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def serialize_appointment(appt: Appointment) -> AppointmentOut:
    """Helper to convert Appointment model into enriched AppointmentOut schema."""
    patient_name = appt.patient.user.full_name if appt.patient and appt.patient.user else None
    doctor_name = appt.doctor.full_name if appt.doctor else None
    doctor_specialty = appt.doctor.specialty if appt.doctor else None
    return AppointmentOut(
        id=appt.id,
        patient_id=appt.patient_id,
        patient_name=patient_name,
        doctor_id=appt.doctor_id,
        doctor_name=doctor_name,
        doctor_specialty=doctor_specialty,
        start_time=appt.start_time,
        end_time=appt.end_time,
        status=appt.status.value,
        reason=appt.reason,
        cancellation_reason=appt.cancellation_reason,
        created_at=appt.created_at,
        updated_at=appt.updated_at,
    )


@router.get("", response_model=List[AppointmentOut])
def list_appointments(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists appointments: patients see their own bookings; administrators see all records."""
    if current_user.role == "admin":
        appointments = db.query(Appointment).order_by(Appointment.start_time.desc()).all()
    else:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        appointments = (
            db.query(Appointment)
            .filter(Appointment.patient_id == patient.id)
            .order_by(Appointment.start_time.asc())
            .all()
        )

    return [serialize_appointment(a) for a in appointments]


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def book_appointment(
    data: AppointmentCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Books a standard available appointment slot for the authenticated patient."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No linked patient profile found")

    patient_id = patient.id if patient else None

    # Check for doctor existence
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    appointment = Appointment(
        patient_id=patient_id,
        doctor_id=data.doctor_id,
        start_time=data.start_time,
        end_time=data.end_time,
        status=AppointmentStatus.SCHEDULED,
        reason=data.reason,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    log_audit_event(
        db=db,
        entity_name="appointment",
        entity_id=appointment.id,
        action="CREATE",
        actor_type="PATIENT",
        actor_id=patient_id,
        details={"start_time": data.start_time.isoformat()},
    )

    return serialize_appointment(appointment)


@router.post("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel_appointment(
    appointment_id: int,
    data: AppointmentCancel,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancels an appointment slot, updates status to 'cancelled', and triggers autonomous n8n workflow."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # Verify authorization
    if current_user.role != "admin":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or appointment.patient_id != patient.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to cancel this appointment",
            )

    if appointment.status == AppointmentStatus.CANCELLED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment is already cancelled")

    # Update appointment state
    cancelling_patient_id = appointment.patient_id
    appointment.status = AppointmentStatus.CANCELLED
    appointment.cancellation_reason = data.cancellation_reason
    appointment.updated_at = datetime.now(timezone.utc)

    log_audit_event(
        db=db,
        entity_name="appointment",
        entity_id=appointment.id,
        action="CANCEL",
        actor_type="USER",
        actor_id=current_user.id,
        details={"reason": data.cancellation_reason},
    )

    db.commit()
    db.refresh(appointment)

    # Dispatch asynchronous event to n8n workflow webhook
    webhook_payload = {
        "event": "appointment_cancelled",
        "appointment_id": appointment.id,
        "doctor_id": appointment.doctor_id,
        "slot_time": appointment.start_time.isoformat(),
        "cancelled_by_patient_id": cancelling_patient_id,
        "reason": data.cancellation_reason,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    background_tasks.add_task(
        trigger_n8n_webhook,
        endpoint_path="appointment-cancelled",
        payload=webhook_payload,
    )

    return serialize_appointment(appointment)


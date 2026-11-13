from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.offer import AppointmentOffer, OfferStatus
from app.models.patient import Patient
from app.schemas.offer import OfferOut, OfferActionResponse
from app.api.deps import get_current_user
from app.services.offer_service import accept_offer_atomic, decline_offer_atomic
from app.services.webhook_service import trigger_n8n_webhook

router = APIRouter(prefix="/offers", tags=["Offers"])


def serialize_offer(offer: AppointmentOffer) -> OfferOut:
    now = datetime.now(timezone.utc)
    patient_name = offer.patient.user.full_name if offer.patient and offer.patient.user else None
    doctor_name = offer.appointment.doctor.full_name if offer.appointment and offer.appointment.doctor else None
    doctor_specialty = offer.appointment.doctor.specialty if offer.appointment and offer.appointment.doctor else None
    slot_start = offer.appointment.start_time if offer.appointment else None
    slot_end = offer.appointment.end_time if offer.appointment else None

    is_expired = offer.status == OfferStatus.PENDING and offer.expires_at < now

    return OfferOut(
        id=offer.id,
        appointment_id=offer.appointment_id,
        patient_id=offer.patient_id,
        patient_name=patient_name,
        doctor_name=doctor_name,
        doctor_specialty=doctor_specialty,
        slot_start_time=slot_start,
        slot_end_time=slot_end,
        status=offer.status.value,
        offered_at=offer.offered_at,
        expires_at=offer.expires_at,
        responded_at=offer.responded_at,
        is_expired=is_expired,
    )


@router.get("/my-active", response_model=Optional[OfferOut])
def get_my_active_offer(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves the active, pending appointment offer for the authenticated patient if one exists."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return None

    now = datetime.now(timezone.utc)
    offer = (
        db.query(AppointmentOffer)
        .filter(
            AppointmentOffer.patient_id == patient.id,
            AppointmentOffer.status == OfferStatus.PENDING,
            AppointmentOffer.expires_at > now,
        )
        .first()
    )

    if not offer:
        return None

    return serialize_offer(offer)


@router.get("/my-history", response_model=List[OfferOut])
def get_my_offer_history(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves full history of offers (accepted, declined, expired) for the patient."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []

    offers = (
        db.query(AppointmentOffer)
        .filter(AppointmentOffer.patient_id == patient.id)
        .order_by(AppointmentOffer.offered_at.desc())
        .all()
    )
    return [serialize_offer(o) for o in offers]


@router.post("/{offer_id}/accept", response_model=OfferActionResponse)
def accept_offer(
    offer_id: int,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Patient accepts a pending offer. Confirms booking atomically with row-level locks."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No patient profile found")

    appointment = accept_offer_atomic(db=db, offer_id=offer_id, patient_id=patient.id)

    # Notify n8n orchestrator
    background_tasks.add_task(
        trigger_n8n_webhook,
        endpoint_path="patient-offer-response",
        payload={
            "event": "offer_accepted",
            "offer_id": offer_id,
            "appointment_id": appointment.id,
            "patient_id": patient.id,
            "status": "accepted",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )

    return OfferActionResponse(
        success=True,
        message="Appointment offer accepted! Your appointment is successfully confirmed.",
        offer_id=offer_id,
        status="accepted",
        appointment_id=appointment.id,
    )


@router.post("/{offer_id}/decline", response_model=OfferActionResponse)
def decline_offer(
    offer_id: int,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Patient declines an offer. Frees slot and immediately triggers agent to offer next candidate."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No patient profile found")

    offer = decline_offer_atomic(db=db, offer_id=offer_id, patient_id=patient.id)

    # Notify n8n orchestrator to initiate next-candidate workflow
    background_tasks.add_task(
        trigger_n8n_webhook,
        endpoint_path="patient-offer-response",
        payload={
            "event": "offer_declined",
            "offer_id": offer_id,
            "appointment_id": offer.appointment_id,
            "patient_id": patient.id,
            "status": "declined",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )

    return OfferActionResponse(
        success=True,
        message="Appointment offer declined. You remain on the waitlist for future slots.",
        offer_id=offer_id,
        status="declined",
        appointment_id=offer.appointment_id,
    )


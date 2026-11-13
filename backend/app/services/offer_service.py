from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status

from app.models.offer import AppointmentOffer, OfferStatus
from app.models.appointment import Appointment, AppointmentStatus
from app.models.waitlist import Waitlist, WaitlistStatus
from app.services.audit_service import log_audit_event


def create_pending_offer(
    db: Session,
    appointment_id: int,
    patient_id: int,
    waitlist_id: int,
    expiry_minutes: int = 15,
) -> AppointmentOffer:
    """Creates a new pending offer for an appointment slot, enforcing one active offer per slot."""
    # Check if slot already has an active pending offer
    existing_offer = (
        db.query(AppointmentOffer)
        .filter(
            AppointmentOffer.appointment_id == appointment_id,
            AppointmentOffer.status == OfferStatus.PENDING,
        )
        .first()
    )

    if existing_offer:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Appointment {appointment_id} already has an active pending offer (Offer ID: {existing_offer.id})",
        )

    # Check appointment status
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=expiry_minutes)

    offer = AppointmentOffer(
        appointment_id=appointment_id,
        patient_id=patient_id,
        waitlist_id=waitlist_id,
        status=OfferStatus.PENDING,
        offered_at=now,
        expires_at=expires_at,
    )
    db.add(offer)

    # Update appointment and waitlist statuses
    appointment.status = AppointmentStatus.OFFERED
    waitlist_entry = db.query(Waitlist).filter(Waitlist.id == waitlist_id).first()
    if waitlist_entry:
        waitlist_entry.status = WaitlistStatus.OFFERED

    db.flush()

    log_audit_event(
        db=db,
        entity_name="offer",
        entity_id=offer.id,
        action="AI_OFFER",
        actor_type="AGENT",
        details={
            "appointment_id": appointment_id,
            "patient_id": patient_id,
            "expires_at": expires_at.isoformat(),
        },
    )

    return offer


def accept_offer_atomic(db: Session, offer_id: int, patient_id: int) -> Appointment:
    """Atomically accepts an offer using row-level locking (SELECT ... FOR UPDATE) to prevent race conditions."""
    now = datetime.now(timezone.utc)

    # 1. Lock offer row
    offer = (
        db.query(AppointmentOffer)
        .filter(
            AppointmentOffer.id == offer_id,
            AppointmentOffer.patient_id == patient_id,
        )
        .with_for_update()
        .first()
    )

    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found or does not belong to this patient",
        )

    if offer.status != OfferStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Offer is no longer pending (Current status: {offer.status.value})",
        )

    if offer.expires_at < now:
        offer.status = OfferStatus.EXPIRED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This offer has expired. The appointment has been passed to the next candidate.",
        )

    # 2. Lock appointment row
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == offer.appointment_id)
        .with_for_update()
        .first()
    )

    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated appointment slot not found")

    if appointment.status not in [AppointmentStatus.OFFERED, AppointmentStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Appointment slot is already {appointment.status.value}",
        )

    # 3. Transition statuses
    offer.status = OfferStatus.ACCEPTED
    offer.responded_at = now

    appointment.status = AppointmentStatus.BOOKED
    appointment.patient_id = patient_id

    waitlist_entry = db.query(Waitlist).filter(Waitlist.id == offer.waitlist_id).first()
    if waitlist_entry:
        waitlist_entry.status = WaitlistStatus.BOOKED

    log_audit_event(
        db=db,
        entity_name="appointment",
        entity_id=appointment.id,
        action="BOOK",
        actor_type="PATIENT",
        actor_id=patient_id,
        details={"offer_id": offer.id, "confirmed_at": now.isoformat()},
    )

    db.commit()
    db.refresh(appointment)
    return appointment


def decline_offer_atomic(db: Session, offer_id: int, patient_id: int) -> AppointmentOffer:
    """Atomically declines an offer and frees the appointment slot for the next candidate."""
    now = datetime.now(timezone.utc)

    offer = (
        db.query(AppointmentOffer)
        .filter(
            AppointmentOffer.id == offer_id,
            AppointmentOffer.patient_id == patient_id,
        )
        .with_for_update()
        .first()
    )

    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")

    if offer.status != OfferStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Offer cannot be declined (Current status: {offer.status.value})",
        )

    offer.status = OfferStatus.DECLINED
    offer.responded_at = now

    # Reset waitlist entry back to waiting
    waitlist_entry = db.query(Waitlist).filter(Waitlist.id == offer.waitlist_id).first()
    if waitlist_entry:
        waitlist_entry.status = WaitlistStatus.WAITING

    log_audit_event(
        db=db,
        entity_name="offer",
        entity_id=offer.id,
        action="DECLINE",
        actor_type="PATIENT",
        actor_id=patient_id,
        details={"appointment_id": offer.appointment_id},
    )

    db.commit()
    db.refresh(offer)
    return offer


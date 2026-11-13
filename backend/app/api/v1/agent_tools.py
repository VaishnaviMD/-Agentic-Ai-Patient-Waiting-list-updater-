from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.deps import verify_agent_secret
from app.models.appointment import Appointment, AppointmentStatus
from app.models.waitlist import Waitlist, WaitlistStatus
from app.models.offer import AppointmentOffer, OfferStatus
from app.models.workflow import WorkflowExecution, WorkflowStatus
from app.models.patient import Patient
from app.schemas.agent_tools import (
    AppointmentDetailsInput,
    AppointmentDetailsOutput,
    EligiblePatientsInput,
    EligiblePatientsOutput,
    EligibleCandidateItem,
    RankCandidatesInput,
    RankCandidatesOutput,
    RankedCandidateItem,
    CreateOfferInput,
    CreateOfferOutput,
    CheckOfferStatusInput,
    CheckOfferStatusOutput,
    BookAppointmentInput,
    BookAppointmentOutput,
    NextCandidateInput,
    NextCandidateOutput,
    NotifyPatientInput,
    NotifyPatientOutput,
    EscalateToAdminInput,
    EscalateToAdminOutput,
)
from app.services.prioritization_service import (
    PrioritizationEngine,
    CandidateInput,
    SlotContext,
    get_time_period_for_time,
)
from app.services.offer_service import create_pending_offer, accept_offer_atomic
from app.services.audit_service import log_audit_event

router = APIRouter(
    prefix="/agent",
    tags=["Agent Tools (Internal API)"],
    dependencies=[Depends(verify_agent_secret)],
)


# -------------------------------------------------------------
# Tool 1: Get Appointment Details
# -------------------------------------------------------------
@router.post("/appointment-details", response_model=AppointmentDetailsOutput)
def tool_get_appointment_details(payload: AppointmentDetailsInput, db: Session = Depends(get_db)):
    """Retrieves slot details, doctor information, and day/period context for the AI agent."""
    appt = db.query(Appointment).filter(Appointment.id == payload.appointment_id).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    day_name = appt.start_time.strftime("%A")
    period_name = get_time_period_for_time(appt.start_time.time())

    return AppointmentDetailsOutput(
        id=appt.id,
        doctor_id=appt.doctor_id,
        doctor_name=appt.doctor.full_name,
        doctor_specialty=appt.doctor.specialty,
        start_time=appt.start_time,
        end_time=appt.end_time,
        day_of_week=day_name,
        time_period=period_name,
        status=appt.status.value,
        cancellation_reason=appt.cancellation_reason,
    )


# -------------------------------------------------------------
# Tool 2: Find Eligible Patients
# -------------------------------------------------------------
@router.post("/eligible-patients", response_model=EligiblePatientsOutput)
def tool_find_eligible_patients(payload: EligiblePatientsInput, db: Session = Depends(get_db)):
    """Finds all patients currently in 'waiting' status for this appointment's doctor."""
    appt = db.query(Appointment).filter(Appointment.id == payload.appointment_id).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # Query active waitlist entries for this doctor
    waitlist_entries = (
        db.query(Waitlist)
        .filter(
            Waitlist.doctor_id == appt.doctor_id,
            Waitlist.status == WaitlistStatus.WAITING,
        )
        .all()
    )

    candidates = []
    for w in waitlist_entries:
        # Count previous declined offers
        declined_count = (
            db.query(AppointmentOffer)
            .filter(
                AppointmentOffer.patient_id == w.patient_id,
                AppointmentOffer.status == OfferStatus.DECLINED,
            )
            .count()
        )
        candidates.append(
            EligibleCandidateItem(
                waitlist_id=w.id,
                patient_id=w.patient_id,
                patient_name=w.patient.user.full_name,
                preferred_days=w.preferred_days,
                preferred_time_periods=w.preferred_time_periods,
                joined_at=w.joined_at,
                declined_offers_count=declined_count,
            )
        )

    return EligiblePatientsOutput(
        appointment_id=appt.id,
        count=len(candidates),
        candidates=candidates,
    )


# -------------------------------------------------------------
# Tool 3: Rank Candidates
# -------------------------------------------------------------
@router.post("/rank-candidates", response_model=RankCandidatesOutput)
def tool_rank_candidates(payload: RankCandidatesInput, db: Session = Depends(get_db)):
    """Runs deterministic Python scoring to rank waitlisted candidates with transparent score breakdown."""
    appt = db.query(Appointment).filter(Appointment.id == payload.appointment_id).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    slot_context = SlotContext(
        doctor_id=appt.doctor_id,
        slot_time=appt.start_time,
        day_of_week=appt.start_time.strftime("%A"),
        time_period=get_time_period_for_time(appt.start_time.time()),
    )

    waitlist_entries = (
        db.query(Waitlist)
        .filter(
            Waitlist.doctor_id == appt.doctor_id,
            Waitlist.status == WaitlistStatus.WAITING,
        )
        .all()
    )

    candidate_inputs = []
    for w in waitlist_entries:
        declined_count = (
            db.query(AppointmentOffer)
            .filter(
                AppointmentOffer.patient_id == w.patient_id,
                AppointmentOffer.status == OfferStatus.DECLINED,
            )
            .count()
        )
        candidate_inputs.append(
            CandidateInput(
                waitlist_id=w.id,
                patient_id=w.patient_id,
                patient_name=w.patient.user.full_name,
                preferred_days=w.preferred_days,
                preferred_time_periods=w.preferred_time_periods,
                joined_at=w.joined_at,
                declined_offers_count=declined_count,
            )
        )

    ranked_results = PrioritizationEngine.rank_candidates(candidate_inputs, slot_context)

    ranked_items = [
        RankedCandidateItem(
            rank=r["rank"],
            waitlist_id=r["waitlist_id"],
            patient_id=r["patient_id"],
            patient_name=r["patient_name"],
            total_score=r["total_score"],
            breakdown=r["breakdown"],
            explanation=r["explanation"],
        )
        for r in ranked_results
    ]

    return RankCandidatesOutput(
        appointment_id=appt.id,
        ranked_candidates=ranked_items,
    )


# -------------------------------------------------------------
# Tool 4: Create Appointment Offer
# -------------------------------------------------------------
@router.post("/create-offer", response_model=CreateOfferOutput)
def tool_create_offer(payload: CreateOfferInput, db: Session = Depends(get_db)):
    """Creates a pending offer with expiration timestamp and database uniqueness validation."""
    offer = create_pending_offer(
        db=db,
        appointment_id=payload.appointment_id,
        patient_id=payload.patient_id,
        waitlist_id=payload.waitlist_id,
        expiry_minutes=payload.expiry_minutes or 15,
    )
    db.commit()
    db.refresh(offer)

    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    patient_name = patient.user.full_name if patient and patient.user else "Patient"

    return CreateOfferOutput(
        offer_id=offer.id,
        appointment_id=offer.appointment_id,
        patient_id=offer.patient_id,
        patient_name=patient_name,
        status=offer.status.value,
        expires_at=offer.expires_at,
        message=f"Offer successfully extended to {patient_name} (Expires in {payload.expiry_minutes or 15} minutes)",
    )


# -------------------------------------------------------------
# Tool 5: Check Offer Status
# -------------------------------------------------------------
@router.post("/check-offer-status", response_model=CheckOfferStatusOutput)
def tool_check_offer_status(payload: CheckOfferStatusInput, db: Session = Depends(get_db)):
    """Inspects the current state of an offer and evaluates expiration."""
    offer = db.query(AppointmentOffer).filter(AppointmentOffer.id == payload.offer_id).first()
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")

    now = datetime.now(timezone.utc)
    is_expired = offer.status == OfferStatus.PENDING and offer.expires_at < now

    if is_expired:
        offer.status = OfferStatus.EXPIRED
        db.commit()

    return CheckOfferStatusOutput(
        offer_id=offer.id,
        appointment_id=offer.appointment_id,
        patient_id=offer.patient_id,
        status=offer.status.value,
        expires_at=offer.expires_at,
        is_expired=is_expired,
    )


# -------------------------------------------------------------
# Tool 5B: Sweep & Process Expired Offers (Used by Workflow C)
# -------------------------------------------------------------
@router.post("/process-expired-offers")
def tool_process_expired_offers(db: Session = Depends(get_db)):
    """Sweeps for timed-out pending offers, marks them 'expired', and returns affected appointment slots."""
    now = datetime.now(timezone.utc)
    expired_offers = (
        db.query(AppointmentOffer)
        .filter(
            AppointmentOffer.status == OfferStatus.PENDING,
            AppointmentOffer.expires_at < now,
        )
        .all()
    )
    processed = []
    for o in expired_offers:
        o.status = OfferStatus.EXPIRED
        processed.append({
            "offer_id": o.id,
            "appointment_id": o.appointment_id,
            "patient_id": o.patient_id,
        })
        log_audit_event(
            db=db,
            entity_name="offer",
            entity_id=o.id,
            action="EXPIRE",
            actor_type="SYSTEM",
            details={"appointment_id": o.appointment_id},
        )
    db.commit()
    return {"count": len(processed), "expired_offers": processed}


# -------------------------------------------------------------
# Tool 6: Book Appointment
# -------------------------------------------------------------
@router.post("/book-appointment", response_model=BookAppointmentOutput)
def tool_book_appointment(payload: BookAppointmentInput, db: Session = Depends(get_db)):
    """Confirms appointment booking only after strict transactional validation."""
    appointment = accept_offer_atomic(
        db=db,
        offer_id=payload.offer_id,
        patient_id=payload.patient_id,
    )

    confirmation_code = f"CONF-{appointment.id}-{int(appointment.start_time.timestamp())}"

    return BookAppointmentOutput(
        success=True,
        appointment_id=appointment.id,
        patient_id=payload.patient_id,
        status=appointment.status.value,
        confirmation_code=confirmation_code,
        message=f"Appointment {appointment.id} successfully confirmed and locked.",
    )


# -------------------------------------------------------------
# Tool 7: Offer to Next Patient
# -------------------------------------------------------------
@router.post("/next-candidate", response_model=NextCandidateOutput)
def tool_next_candidate(payload: NextCandidateInput, db: Session = Depends(get_db)):
    """Determines the next best eligible candidate after a decline or expiration."""
    appt = db.query(Appointment).filter(Appointment.id == payload.appointment_id).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # Find patients who have ALREADY received an offer for this specific appointment
    existing_offered_patient_ids = [
        o.patient_id for o in db.query(AppointmentOffer).filter(AppointmentOffer.appointment_id == appt.id).all()
    ]

    slot_context = SlotContext(
        doctor_id=appt.doctor_id,
        slot_time=appt.start_time,
        day_of_week=appt.start_time.strftime("%A"),
        time_period=get_time_period_for_time(appt.start_time.time()),
    )

    # Query active waitlist entries excluding already offered patients
    waitlist_entries = (
        db.query(Waitlist)
        .filter(
            Waitlist.doctor_id == appt.doctor_id,
            Waitlist.status == WaitlistStatus.WAITING,
            ~Waitlist.patient_id.in_(existing_offered_patient_ids),
        )
        .all()
    )

    if not waitlist_entries:
        return NextCandidateOutput(
            appointment_id=appt.id,
            has_next=False,
            next_candidate=None,
            message="No remaining eligible waitlist candidates found for this slot.",
        )

    candidate_inputs = []
    for w in waitlist_entries:
        declined_count = (
            db.query(AppointmentOffer)
            .filter(
                AppointmentOffer.patient_id == w.patient_id,
                AppointmentOffer.status == OfferStatus.DECLINED,
            )
            .count()
        )
        candidate_inputs.append(
            CandidateInput(
                waitlist_id=w.id,
                patient_id=w.patient_id,
                patient_name=w.patient.user.full_name,
                preferred_days=w.preferred_days,
                preferred_time_periods=w.preferred_time_periods,
                joined_at=w.joined_at,
                declined_offers_count=declined_count,
            )
        )

    ranked_results = PrioritizationEngine.rank_candidates(candidate_inputs, slot_context)
    if not ranked_results:
        return NextCandidateOutput(
            appointment_id=appt.id,
            has_next=False,
            next_candidate=None,
            message="All remaining candidates disqualified due to preference mismatch.",
        )

    top = ranked_results[0]
    next_candidate_item = RankedCandidateItem(
        rank=1,
        waitlist_id=top["waitlist_id"],
        patient_id=top["patient_id"],
        patient_name=top["patient_name"],
        total_score=top["total_score"],
        breakdown=top["breakdown"],
        explanation=top["explanation"],
    )

    return NextCandidateOutput(
        appointment_id=appt.id,
        has_next=True,
        next_candidate=next_candidate_item,
        message=f"Next candidate identified: {top['patient_name']} (Score: {top['total_score']} pts)",
    )


# -------------------------------------------------------------
# Tool 8: Notify Patient
# -------------------------------------------------------------
@router.post("/notify-patient", response_model=NotifyPatientOutput)
def tool_notify_patient(payload: NotifyPatientInput, db: Session = Depends(get_db)):
    """Dispatches a notification to the patient portal."""
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    log_audit_event(
        db=db,
        entity_name="notification",
        entity_id=payload.patient_id,
        action="NOTIFICATION_SENT",
        actor_type="AGENT",
        details={
            "notification_type": payload.notification_type,
            "offer_id": payload.offer_id,
            "message": payload.message,
        },
    )
    db.commit()

    return NotifyPatientOutput(
        success=True,
        patient_id=payload.patient_id,
        delivery_channel="in_app_portal",
        status="delivered",
        timestamp=datetime.now(timezone.utc),
    )


# -------------------------------------------------------------
# Tool 9: Escalate to Admin
# -------------------------------------------------------------
@router.post("/escalate-to-admin", response_model=EscalateToAdminOutput)
def tool_escalate_to_admin(payload: EscalateToAdminInput, db: Session = Depends(get_db)):
    """Creates an administrative escalation record when the autonomous workflow requires human intervention."""
    workflow_rec = WorkflowExecution(
        workflow_type="cancellation_coordinator",
        trigger_event="escalation_required",
        appointment_id=payload.appointment_id,
        status=WorkflowStatus.ESCALATED,
        agent_decisions={"reason": payload.reason, "context": payload.context or {}},
        error_message=payload.reason,
    )
    db.add(workflow_rec)

    log_audit_event(
        db=db,
        entity_name="appointment",
        entity_id=payload.appointment_id,
        action="ESCALATE_TO_ADMIN",
        actor_type="AGENT",
        details={"reason": payload.reason},
    )
    db.commit()
    db.refresh(workflow_rec)

    return EscalateToAdminOutput(
        escalation_id=workflow_rec.id,
        appointment_id=payload.appointment_id,
        status="escalated",
        message="Workflow successfully escalated to Hospital Administrator.",
        admin_notified=True,
    )


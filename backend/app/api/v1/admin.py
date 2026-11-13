from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.api.deps import require_admin
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.waitlist import Waitlist, WaitlistStatus
from app.models.offer import AppointmentOffer, OfferStatus
from app.models.workflow import WorkflowExecution
from app.models.audit import AuditLog

router = APIRouter(
    prefix="/admin",
    tags=["Administration & Monitoring"],
    dependencies=[Depends(require_admin)],
)


@router.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Computes high-level clinical and operational scheduling metrics for the hospital dashboard."""
    total_doctors = db.query(Doctor).filter(Doctor.is_active == True).count()
    total_patients = db.query(Patient).count()

    total_scheduled = db.query(Appointment).filter(Appointment.status == AppointmentStatus.SCHEDULED).count()
    total_booked = db.query(Appointment).filter(Appointment.status == AppointmentStatus.BOOKED).count()
    total_cancelled = db.query(Appointment).filter(Appointment.status == AppointmentStatus.CANCELLED).count()

    active_waitlist_count = db.query(Waitlist).filter(Waitlist.status == WaitlistStatus.WAITING).count()
    active_offers_count = db.query(AppointmentOffer).filter(AppointmentOffer.status == OfferStatus.PENDING).count()

    accepted_offers_count = db.query(AppointmentOffer).filter(AppointmentOffer.status == OfferStatus.ACCEPTED).count()
    total_offers_count = db.query(AppointmentOffer).count()

    # Recovery rate: percentage of cancelled/offered appointments successfully converted to bookings
    recovery_rate = 0.0
    if total_offers_count > 0:
        recovery_rate = round((accepted_offers_count / total_offers_count) * 100, 1)

    return {
        "total_doctors": total_doctors,
        "total_patients": total_patients,
        "total_active_appointments": total_scheduled + total_booked,
        "total_cancellations": total_cancelled,
        "active_waitlist_count": active_waitlist_count,
        "active_pending_offers": active_offers_count,
        "total_offers_extended": total_offers_count,
        "offers_accepted": accepted_offers_count,
        "recovery_rate_percentage": recovery_rate,
    }


@router.get("/workflows")
def list_workflow_executions(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Retrieves recent autonomous agent workflow runs and decision outcomes."""
    workflows = (
        db.query(WorkflowExecution)
        .order_by(WorkflowExecution.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": w.id,
            "workflow_type": w.workflow_type,
            "trigger_event": w.trigger_event,
            "appointment_id": w.appointment_id,
            "n8n_execution_id": w.n8n_execution_id,
            "status": w.status.value,
            "agent_decisions": w.agent_decisions,
            "error_message": w.error_message,
            "created_at": w.created_at,
        }
        for w in workflows
    ]


@router.get("/audit-logs")
def list_audit_logs(
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieves immutable audit trail entries."""
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "entity_name": l.entity_name,
            "entity_id": l.entity_id,
            "action": l.action,
            "actor_type": l.actor_type,
            "actor_id": l.actor_id,
            "details": l.details,
            "timestamp": l.timestamp,
        }
        for l in logs
    ]


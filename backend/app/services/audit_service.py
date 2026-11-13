from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from app.models.audit import AuditLog


def log_audit_event(
    db: Session,
    entity_name: str,
    entity_id: int,
    action: str,
    actor_type: str,
    actor_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """Records an immutable audit event for compliance and administrative observability."""
    audit_entry = AuditLog(
        entity_name=entity_name,
        entity_id=entity_id,
        action=action,
        actor_type=actor_type,
        actor_id=actor_id,
        details=details or {},
    )
    db.add(audit_entry)
    db.flush()
    return audit_entry


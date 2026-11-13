from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base


class AuditLog(Base):
    """Immutable audit trail for compliance, security, and administrative oversight."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    entity_name = Column(String(100), index=True, nullable=False)  # e.g., 'appointment', 'offer'
    entity_id = Column(Integer, index=True, nullable=False)
    action = Column(String(50), nullable=False)  # e.g., 'CREATE', 'CANCEL', 'AI_OFFER', 'BOOK'
    actor_type = Column(String(50), nullable=False)  # 'PATIENT', 'ADMIN', 'AGENT', 'SYSTEM'
    actor_id = Column(Integer, nullable=True)
    details = Column(JSONB, default=dict, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)


from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class WorkflowStatus(str, enum.Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    ESCALATED = "escalated"


class WorkflowExecution(Base):
    """Tracks n8n and AI Agent autonomous execution runs and decision trees."""

    __tablename__ = "workflow_executions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    workflow_type = Column(String(100), nullable=False)  # e.g., 'cancellation_coordinator', 'expiration_monitor'
    trigger_event = Column(String(100), nullable=False)  # e.g., 'appointment_cancelled'
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    n8n_execution_id = Column(String(100), index=True, nullable=True)
    status = Column(
        Enum(WorkflowStatus, values_callable=lambda x: [e.value for e in x]),
        default=WorkflowStatus.RUNNING,
        index=True,
        nullable=False,
    )
    agent_decisions = Column(JSONB, default=dict, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    appointment = relationship("Appointment", back_populates="workflows")


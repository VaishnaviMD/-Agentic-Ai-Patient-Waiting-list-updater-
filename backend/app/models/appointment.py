from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, Enum
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"
    OFFERED = "offered"
    BOOKED = "booked"
    COMPLETED = "completed"
    NO_SHOW = "no_show"


class Appointment(Base):
    """Authoritative appointment slot record."""

    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime(timezone=True), index=True, nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        Enum(AppointmentStatus, values_callable=lambda x: [e.value for e in x]),
        default=AppointmentStatus.SCHEDULED,
        index=True,
        nullable=False,
    )
    reason = Column(String(255), nullable=True)
    cancellation_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    offers = relationship("AppointmentOffer", back_populates="appointment", cascade="all, delete-orphan")
    workflows = relationship("WorkflowExecution", back_populates="appointment")


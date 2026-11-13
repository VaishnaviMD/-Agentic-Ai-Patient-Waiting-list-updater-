from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, func, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class WaitlistStatus(str, enum.Enum):
    WAITING = "waiting"
    OFFERED = "offered"
    BOOKED = "booked"
    REMOVED = "removed"


class Waitlist(Base):
    """Waitlist registration entry for a patient seeking an appointment with a doctor."""

    __tablename__ = "waitlist"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    preferred_days = Column(JSONB, default=list, nullable=False)  # e.g., ["Monday", "Wednesday"]
    preferred_time_periods = Column(JSONB, default=list, nullable=False)  # e.g., ["Morning", "Afternoon"]
    status = Column(
        Enum(WaitlistStatus, values_callable=lambda x: [e.value for e in x]),
        default=WaitlistStatus.WAITING,
        index=True,
        nullable=False,
    )
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    patient = relationship("Patient", back_populates="waitlist_entries")
    doctor = relationship("Doctor", back_populates="waitlists")
    offers = relationship("AppointmentOffer", back_populates="waitlist_entry")


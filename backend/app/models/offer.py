from sqlalchemy import Column, Integer, DateTime, ForeignKey, func, Enum, Index
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class OfferStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"


class AppointmentOffer(Base):
    """Time-sensitive offer extended to a waitlisted patient for an open appointment slot."""

    __tablename__ = "appointment_offers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    waitlist_id = Column(Integer, ForeignKey("waitlist.id", ondelete="CASCADE"), nullable=False)
    status = Column(
        Enum(OfferStatus, values_callable=lambda x: [e.value for e in x]),
        default=OfferStatus.PENDING,
        index=True,
        nullable=False,
    )
    offered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), index=True, nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    appointment = relationship("Appointment", back_populates="offers")
    patient = relationship("Patient", back_populates="offers")
    waitlist_entry = relationship("Waitlist", back_populates="offers")

    # Table constraints: Guarantee only ONE pending offer per appointment slot
    __table_args__ = (
        Index(
            "uq_pending_offer_per_appointment",
            "appointment_id",
            unique=True,
            postgresql_where=(status == "pending"),
        ),
    )


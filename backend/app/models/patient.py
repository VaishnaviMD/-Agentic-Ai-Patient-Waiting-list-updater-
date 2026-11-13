from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Patient(Base):
    """Patient clinical and demographic profile."""

    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    medical_record_number = Column(String(50), unique=True, index=True, nullable=False)
    emergency_contact = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="patient_profile")
    appointments = relationship("Appointment", back_populates="patient")
    waitlist_entries = relationship("Waitlist", back_populates="patient", cascade="all, delete-orphan")
    offers = relationship("AppointmentOffer", back_populates="patient")


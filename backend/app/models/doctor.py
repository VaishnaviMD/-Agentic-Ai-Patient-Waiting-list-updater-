from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Doctor(Base):
    """Doctor medical practitioner profile."""

    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True)
    full_name = Column(String(255), nullable=False)
    specialty = Column(String(100), index=True, nullable=False)
    room_number = Column(String(50), nullable=True)
    consultation_fee = Column(Numeric(10, 2), default=150.00, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    availabilities = relationship("DoctorAvailability", back_populates="doctor", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="doctor")
    waitlists = relationship("Waitlist", back_populates="doctor")


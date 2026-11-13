from datetime import datetime, date, time, timezone, timedelta
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.doctor_availability import DoctorAvailability
from app.models.appointment import Appointment, AppointmentStatus
from app.models.waitlist import Waitlist, WaitlistStatus


def seed_database():
    """Seeds realistic synthetic clinical data for immediate demonstration and testing."""
    db = SessionLocal()
    try:
        print("🌱 Seeding CareFlow AI Health Platform demo data...")

        # 1. System Admin
        admin_user = db.query(User).filter(User.email == "admin@careflow.hospital").first()
        if not admin_user:
            admin_user = User(
                email="admin@careflow.hospital",
                password_hash=get_password_hash("Admin123!"),
                role="admin",
                full_name="Hospital Administrator",
                phone="+1 (555) 010-0000",
            )
            db.add(admin_user)
            db.flush()
            print("  ✅ Admin user created (admin@careflow.hospital / Admin123!)")

        # 2. Doctors
        doctors_data = [
            {
                "full_name": "Dr. Rajesh Sharma",
                "specialty": "Cardiology",
                "room_number": "Room 302",
                "consultation_fee": 200.00,
                "days": [1, 3, 5],  # Mon, Wed, Fri
            },
            {
                "full_name": "Dr. Priya Patel",
                "specialty": "Neurology",
                "room_number": "Room 405",
                "consultation_fee": 250.00,
                "days": [2, 4],  # Tue, Thu
            },
            {
                "full_name": "Dr. Vikram Mehta",
                "specialty": "Orthopedics",
                "room_number": "Room 108",
                "consultation_fee": 180.00,
                "days": [1, 4, 6],  # Mon, Thu, Sat
            },
        ]

        created_doctors = []
        for doc in doctors_data:
            doctor = db.query(Doctor).filter(Doctor.full_name == doc["full_name"]).first()
            if not doctor:
                doctor = Doctor(
                    full_name=doc["full_name"],
                    specialty=doc["specialty"],
                    room_number=doc["room_number"],
                    consultation_fee=doc["consultation_fee"],
                    is_active=True,
                )
                db.add(doctor)
                db.flush()

                # Add weekly schedule
                for d in doc["days"]:
                    avail = DoctorAvailability(
                        doctor_id=doctor.id,
                        day_of_week=d,
                        start_time=time(9, 0),
                        end_time=time(17, 0),
                        slot_duration_minutes=30,
                        is_active=True,
                    )
                    db.add(avail)

                print(f"  ✅ Doctor created: {doc['full_name']} ({doc['specialty']})")
            created_doctors.append(doctor)

        # 3. Patient Users
        patients_data = [
            {
                "email": "alice@example.com",
                "name": "Alice Johnson",
                "dob": date(1990, 5, 12),
                "mrn": "MRN-1001-ALICE",
                "phone": "+1 (555) 019-1111",
            },
            {
                "email": "bob@example.com",
                "name": "Bob Williams",
                "dob": date(1985, 8, 24),
                "mrn": "MRN-1002-BOB",
                "phone": "+1 (555) 019-2222",
            },
            {
                "email": "charlie@example.com",
                "name": "Charlie Davis",
                "dob": date(1978, 11, 30),
                "mrn": "MRN-1003-CHARLIE",
                "phone": "+1 (555) 019-3333",
            },
        ]

        created_patients = []
        for p in patients_data:
            user = db.query(User).filter(User.email == p["email"]).first()
            if not user:
                user = User(
                    email=p["email"],
                    password_hash=get_password_hash("Password123!"),
                    role="patient",
                    full_name=p["name"],
                    phone=p["phone"],
                )
                db.add(user)
                db.flush()

                patient = Patient(
                    user_id=user.id,
                    date_of_birth=p["dob"],
                    medical_record_number=p["mrn"],
                    emergency_contact="+1 (555) 999-0000",
                )
                db.add(patient)
                db.flush()
                print(f"  ✅ Patient created: {p['name']} ({p['email']} / Password123!)")
            else:
                patient = user.patient_profile
            created_patients.append(patient)

        # 4. Create an Appointment for Alice with Dr. Sharma (next Monday at 3 PM)
        dr_sharma = created_doctors[0]
        alice = created_patients[0]
        bob = created_patients[1]
        charlie = created_patients[2]

        now = datetime.now(timezone.utc)
        # Find next Monday 15:00 UTC
        days_ahead = 7 - now.weekday() if now.weekday() >= 0 else 0
        if days_ahead == 0:
            days_ahead = 7
        next_monday = (now + timedelta(days=days_ahead)).replace(hour=15, minute=0, second=0, microsecond=0)

        existing_appt = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == dr_sharma.id,
                Appointment.patient_id == alice.id,
            )
            .first()
        )

        if not existing_appt:
            appt = Appointment(
                doctor_id=dr_sharma.id,
                patient_id=alice.id,
                start_time=next_monday,
                end_time=next_monday + timedelta(minutes=30),
                status=AppointmentStatus.SCHEDULED,
                reason="Routine Cardiac Assessment",
            )
            db.add(appt)
            db.flush()
            demo_appt_id = appt.id
            print(f"  ✅ Scheduled demo appointment for Alice with Dr. Sharma at {next_monday.strftime('%A %I:%M %p')}")
        else:
            existing_appt.patient_id = alice.id
            existing_appt.status = AppointmentStatus.SCHEDULED
            existing_appt.start_time = next_monday
            existing_appt.end_time = next_monday + timedelta(minutes=30)
            existing_appt.cancellation_reason = None
            demo_appt_id = existing_appt.id
            print(f"  ✅ Reset demo appointment for Alice with Dr. Sharma at {next_monday.strftime('%A %I:%M %p')}")

        # Clean up any stale offers for the demo appointment
        from app.models.offer import AppointmentOffer
        db.query(AppointmentOffer).filter(AppointmentOffer.appointment_id == demo_appt_id).delete()

        # 5. Place Bob and Charlie on Dr. Sharma's waitlist
        # Bob: Preferred Monday Afternoon (High Priority!)
        bob_waitlist = (
            db.query(Waitlist)
            .filter(
                Waitlist.patient_id == bob.id,
                Waitlist.doctor_id == dr_sharma.id,
            )
            .first()
        )
        if not bob_waitlist:
            bob_waitlist = Waitlist(
                patient_id=bob.id,
                doctor_id=dr_sharma.id,
                preferred_days=["Monday"],
                preferred_time_periods=["Afternoon"],
                status=WaitlistStatus.WAITING,
                joined_at=now - timedelta(days=3),
                notes="Patient needs afternoon consultation due to morning work schedule.",
            )
            db.add(bob_waitlist)
            print("  ✅ Bob registered on Dr. Sharma waitlist (Preferred: Monday Afternoon)")
        else:
            bob_waitlist.status = WaitlistStatus.WAITING
            bob_waitlist.preferred_days = ["Monday"]
            bob_waitlist.preferred_time_periods = ["Afternoon"]
            print("  ✅ Bob waitlist status reset to WAITING")

        # Charlie: Preferred Any Day (Medium Priority)
        charlie_waitlist = (
            db.query(Waitlist)
            .filter(
                Waitlist.patient_id == charlie.id,
                Waitlist.doctor_id == dr_sharma.id,
            )
            .first()
        )
        if not charlie_waitlist:
            charlie_waitlist = Waitlist(
                patient_id=charlie.id,
                doctor_id=dr_sharma.id,
                preferred_days=["Any"],
                preferred_time_periods=["Any"],
                status=WaitlistStatus.WAITING,
                joined_at=now - timedelta(days=1),
                notes="Flexible availability.",
            )
            db.add(charlie_waitlist)
            print("  ✅ Charlie registered on Dr. Sharma waitlist (Preferred: Any Day/Time)")
        else:
            charlie_waitlist.status = WaitlistStatus.WAITING
            charlie_waitlist.preferred_days = ["Any"]
            charlie_waitlist.preferred_time_periods = ["Any"]
            print("  ✅ Charlie waitlist status reset to WAITING")

        db.commit()
        print("🎉 Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()


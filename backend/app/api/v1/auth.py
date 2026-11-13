from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.models.patient import Patient
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


def build_user_out(user: User) -> UserOut:
    """Helper to convert ORM User into UserOut with patient_id/doctor_id."""
    patient_id = user.patient_profile.id if user.patient_profile else None
    doctor_id = user.doctor_profile.id if user.doctor_profile else None
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        phone=user.phone,
        is_active=user.is_active,
        created_at=user.created_at,
        patient_id=patient_id,
        doctor_id=doctor_id,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Registers a new user account (patient or admin) and issues an initial JWT token."""
    # Check if email is already registered
    existing_user = db.query(User).filter(User.email == data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists",
        )

    # Create User record
    user = User(
        email=data.email.lower(),
        password_hash=get_password_hash(data.password),
        full_name=data.full_name,
        role=data.role,
        phone=data.phone,
    )
    db.add(user)
    db.flush()  # Flush to populate user.id

    # If patient, create linked clinical Patient record
    if data.role == "patient":
        mrn = f"MRN-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        patient = Patient(
            user_id=user.id,
            date_of_birth=data.date_of_birth,
            medical_record_number=mrn,
            emergency_contact=data.emergency_contact,
        )
        db.add(patient)

    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=build_user_out(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Authenticates credentials and returns a secure JWT bearer token."""
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is disabled")

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=build_user_out(user),
    )


@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieves the authenticated user's profile and linked entity IDs."""
    return build_user_out(current_user)


import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta

from app.main import app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.offer import AppointmentOffer, OfferStatus
from app.models.appointment import Appointment, AppointmentStatus

client = TestClient(app)
AGENT_HEADERS = {"X-Agent-Secret": settings.AGENT_INTERNAL_SECRET}


def test_cannot_create_duplicate_pending_offers_for_same_appointment():
    """Validates that the database constraint rejects two active pending offers for the same slot."""
    # Attempting to create another offer for appointment 1 (which already has an active pending offer from previous test)
    res = client.post(
        "/api/v1/agent/create-offer",
        json={
            "appointment_id": 1,
            "patient_id": 4,  # Charlie
            "waitlist_id": 2,
            "expiry_minutes": 15,
        },
        headers=AGENT_HEADERS,
    )
    # Must fail with 409 Conflict
    assert res.status_code == 409
    assert "already has an active pending offer" in res.json()["detail"]


def test_cannot_accept_already_accepted_offer():
    """Once an offer is accepted and the slot is booked, subsequent acceptance attempts must fail."""
    db = SessionLocal()
    try:
        # Find the active pending offer for appointment 1
        offer = (
            db.query(AppointmentOffer)
            .filter(
                AppointmentOffer.appointment_id == 1,
                AppointmentOffer.status == OfferStatus.PENDING,
            )
            .first()
        )
        assert offer is not None
        offer_id = offer.id
        patient_id = offer.patient_id

        # First acceptance: Should succeed
        res1 = client.post(
            "/api/v1/agent/book-appointment",
            json={"offer_id": offer_id, "appointment_id": 1, "patient_id": patient_id},
            headers=AGENT_HEADERS,
        )
        assert res1.status_code == 200
        assert res1.json()["status"] == "booked"

        # Second acceptance attempt (simulating concurrent race condition): Must fail with 400
        res2 = client.post(
            "/api/v1/agent/book-appointment",
            json={"offer_id": offer_id, "appointment_id": 1, "patient_id": patient_id},
            headers=AGENT_HEADERS,
        )
        assert res2.status_code == 400
        assert "Offer is no longer pending" in res2.json()["detail"]
    finally:
        db.close()


def test_cannot_accept_expired_offer():
    """An offer whose expiration timestamp has passed cannot be booked."""
    db = SessionLocal()
    try:
        # Create an already expired offer for testing
        expired_offer = AppointmentOffer(
            appointment_id=1,
            patient_id=4,
            waitlist_id=2,
            status=OfferStatus.PENDING,
            offered_at=datetime.now(timezone.utc) - timedelta(minutes=30),
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
        db.add(expired_offer)
        db.commit()
        db.refresh(expired_offer)
        expired_offer_id = expired_offer.id
    finally:
        db.close()

    res = client.post(
        "/api/v1/agent/book-appointment",
        json={"offer_id": expired_offer_id, "appointment_id": 1, "patient_id": 4},
        headers=AGENT_HEADERS,
    )
    # Must fail with 410 Gone
    assert res.status_code == 410
    assert "offer has expired" in res.json()["detail"]


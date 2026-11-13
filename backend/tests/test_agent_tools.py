import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta

from app.main import app
from app.core.config import settings

client = TestClient(app)
AGENT_HEADERS = {"X-Agent-Secret": settings.AGENT_INTERNAL_SECRET}


def test_agent_tools_unauthorized_without_secret():
    """Internal Agent endpoints must strictly reject requests without valid X-Agent-Secret."""
    res = client.post("/api/v1/agent/appointment-details", json={"appointment_id": 1})
    assert res.status_code == 401
    assert "Invalid or missing X-Agent-Secret" in res.json()["detail"]


def test_tool_get_appointment_details():
    """Agent tool successfully retrieves slot context for reasoning."""
    res = client.post(
        "/api/v1/agent/appointment-details",
        json={"appointment_id": 1},
        headers=AGENT_HEADERS,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert data["doctor_name"] == "Dr. Rajesh Sharma"
    assert data["doctor_specialty"] == "Cardiology"
    assert "start_time" in data
    assert data["day_of_week"] == "Monday"


def test_tool_find_eligible_patients():
    """Agent tool queries active waitlisted candidates for the doctor."""
    res = client.post(
        "/api/v1/agent/eligible-patients",
        json={"appointment_id": 1},
        headers=AGENT_HEADERS,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 2
    candidate_names = [c["patient_name"] for c in data["candidates"]]
    assert "Bob Williams" in candidate_names
    assert "Charlie Davis" in candidate_names


def test_tool_rank_candidates():
    """Agent tool executes deterministic Python scoring engine."""
    res = client.post(
        "/api/v1/agent/rank-candidates",
        json={"appointment_id": 1},
        headers=AGENT_HEADERS,
    )
    assert res.status_code == 200
    ranked = res.json()["ranked_candidates"]
    assert len(ranked) >= 2
    # Bob Williams has exact Monday + exact Afternoon match -> Rank 1 (Score 100)
    assert ranked[0]["patient_name"] == "Bob Williams"
    assert ranked[0]["total_score"] == 100
    assert ranked[0]["rank"] == 1


def test_tool_create_offer_and_check_status():
    """Agent tool creates a pending offer with 15-minute expiration."""
    # Create offer for Bob (patient_id=3, waitlist_id=1)
    res = client.post(
        "/api/v1/agent/create-offer",
        json={
            "appointment_id": 1,
            "patient_id": 3,
            "waitlist_id": 1,
            "expiry_minutes": 15,
        },
        headers=AGENT_HEADERS,
    )
    assert res.status_code == 200
    offer_data = res.json()
    assert offer_data["status"] == "pending"
    offer_id = offer_data["offer_id"]

    # Check status
    status_res = client.post(
        "/api/v1/agent/check-offer-status",
        json={"offer_id": offer_id},
        headers=AGENT_HEADERS,
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "pending"
    assert status_res.json()["is_expired"] is False


def test_tool_next_candidate():
    """Agent tool filters candidates who already received an offer and finds the next best."""
    res = client.post(
        "/api/v1/agent/next-candidate",
        json={"appointment_id": 1},
        headers=AGENT_HEADERS,
    )
    assert res.status_code == 200
    data = res.json()
    # Bob already received offer above, so Charlie Davis must be the next candidate
    assert data["has_next"] is True
    assert data["next_candidate"]["patient_name"] == "Charlie Davis"


def test_tool_notify_patient():
    """Agent tool records portal notification delivery."""
    res = client.post(
        "/api/v1/agent/notify-patient",
        json={
            "patient_id": 3,
            "offer_id": 1,
            "notification_type": "offer_created",
        },
        headers=AGENT_HEADERS,
    )
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert res.json()["status"] == "delivered"


def test_tool_escalate_to_admin():
    """Agent tool records escalation incident in admin workflow monitor."""
    res = client.post(
        "/api/v1/agent/escalate-to-admin",
        json={
            "appointment_id": 1,
            "reason": "Test escalation: Waitlist candidate declined and queue exhausted.",
            "context": {"attempt": 2},
        },
        headers=AGENT_HEADERS,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "escalated"
    assert res.json()["admin_notified"] is True


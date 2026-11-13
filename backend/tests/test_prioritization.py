import pytest
from datetime import datetime, timezone, timedelta, time
from app.services.prioritization_service import (
    PrioritizationEngine,
    CandidateInput,
    SlotContext,
    get_time_period_for_time,
)


@pytest.fixture
def base_slot():
    return SlotContext(
        doctor_id=1,
        slot_time=datetime(2026, 11, 16, 15, 0, tzinfo=timezone.utc),  # Monday 3 PM
        day_of_week="Monday",
        time_period="Afternoon",
    )


def test_time_period_categorization():
    assert get_time_period_for_time(time(9, 30)) == "Morning"
    assert get_time_period_for_time(time(14, 0)) == "Afternoon"
    assert get_time_period_for_time(time(18, 30)) == "Evening"
    assert get_time_period_for_time(time(23, 0)) == "Other"


def test_perfect_match_scores_100(base_slot):
    candidate = CandidateInput(
        waitlist_id=1,
        patient_id=101,
        patient_name="Alice Smith",
        preferred_days=["Monday"],
        preferred_time_periods=["Afternoon"],
        joined_at=datetime(2026, 11, 1, 10, 0, tzinfo=timezone.utc),
        declined_offers_count=0,
    )

    ranked = PrioritizationEngine.rank_candidates([candidate], base_slot)
    assert len(ranked) == 1
    assert ranked[0]["total_score"] == 100
    assert ranked[0]["breakdown"]["day_match"] == 25
    assert ranked[0]["breakdown"]["time_match"] == 25
    assert ranked[0]["breakdown"]["fifo_seniority"] == 25
    assert ranked[0]["breakdown"]["history_fairness"] == 25


def test_flexible_preferences_score(base_slot):
    candidate = CandidateInput(
        waitlist_id=2,
        patient_id=102,
        patient_name="Bob Jones",
        preferred_days=["Any"],
        preferred_time_periods=["Any"],
        joined_at=datetime(2026, 11, 1, 10, 0, tzinfo=timezone.utc),
        declined_offers_count=0,
    )

    ranked = PrioritizationEngine.rank_candidates([candidate], base_slot)
    assert len(ranked) == 1
    # 15 (Any day) + 15 (Any time) + 25 (FIFO) + 25 (History) = 80
    assert ranked[0]["total_score"] == 80


def test_fifo_seniority_decrement(base_slot):
    c1 = CandidateInput(
        waitlist_id=1,
        patient_id=101,
        patient_name="First",
        preferred_days=["Monday"],
        preferred_time_periods=["Afternoon"],
        joined_at=datetime(2026, 11, 1, 10, 0, tzinfo=timezone.utc),
    )
    c2 = CandidateInput(
        waitlist_id=2,
        patient_id=102,
        patient_name="Second",
        preferred_days=["Monday"],
        preferred_time_periods=["Afternoon"],
        joined_at=datetime(2026, 11, 2, 10, 0, tzinfo=timezone.utc),
    )

    ranked = PrioritizationEngine.rank_candidates([c1, c2], base_slot)
    assert len(ranked) == 2
    assert ranked[0]["patient_id"] == 101
    assert ranked[0]["breakdown"]["fifo_seniority"] == 25
    assert ranked[1]["patient_id"] == 102
    assert ranked[1]["breakdown"]["fifo_seniority"] == 20


def test_declined_offers_fairness_penalty(base_slot):
    candidate = CandidateInput(
        waitlist_id=3,
        patient_id=103,
        patient_name="Charlie",
        preferred_days=["Monday"],
        preferred_time_periods=["Afternoon"],
        joined_at=datetime(2026, 11, 1, 10, 0, tzinfo=timezone.utc),
        declined_offers_count=2,  # 2 declines -> 5 points
    )

    ranked = PrioritizationEngine.rank_candidates([candidate], base_slot)
    assert ranked[0]["breakdown"]["history_fairness"] == 5
    assert ranked[0]["total_score"] == 80  # 25 + 25 + 25 + 5


def test_day_mismatch_disqualification(base_slot):
    candidate = CandidateInput(
        waitlist_id=4,
        patient_id=104,
        patient_name="David",
        preferred_days=["Tuesday", "Friday"],  # Slot is Monday!
        preferred_time_periods=["Afternoon"],
        joined_at=datetime(2026, 11, 1, 10, 0, tzinfo=timezone.utc),
    )

    ranked = PrioritizationEngine.rank_candidates([candidate], base_slot)
    assert len(ranked) == 0  # Disqualified because Monday was not in preferred days


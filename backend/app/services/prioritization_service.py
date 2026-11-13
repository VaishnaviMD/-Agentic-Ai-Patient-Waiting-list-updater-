from typing import List, Dict, Any, Optional
from datetime import datetime, time
from dataclasses import dataclass


@dataclass
class CandidateInput:
    waitlist_id: int
    patient_id: int
    patient_name: str
    preferred_days: List[str]
    preferred_time_periods: List[str]
    joined_at: datetime
    declined_offers_count: int = 0


@dataclass
class SlotContext:
    doctor_id: int
    slot_time: datetime
    day_of_week: str  # e.g., 'Monday'
    time_period: str  # 'Morning', 'Afternoon', or 'Evening'


def get_time_period_for_time(t: time) -> str:
    """Categorizes a given time into Morning, Afternoon, or Evening."""
    hour = t.hour
    if 8 <= hour < 12:
        return "Morning"
    elif 12 <= hour < 16:
        return "Afternoon"
    elif 16 <= hour <= 20:
        return "Evening"
    return "Other"


class PrioritizationEngine:
    """Deterministic, transparent scoring engine for waitlist candidate prioritization."""

    @staticmethod
    def calculate_score(candidate: CandidateInput, slot: SlotContext, fifo_rank: int) -> Dict[str, Any]:
        """Calculates deterministic points and provides a transparent explanation."""
        breakdown = {
            "day_match": 0,
            "time_match": 0,
            "fifo_seniority": 0,
            "history_fairness": 0,
        }

        # 1. Day Match Scoring (+25 exact, +15 any/flexible)
        pref_days = [d.strip().capitalize() for d in candidate.preferred_days]
        if not pref_days or "Any" in pref_days:
            breakdown["day_match"] = 15
        elif slot.day_of_week.capitalize() in pref_days:
            breakdown["day_match"] = 25
        else:
            breakdown["day_match"] = 0

        # 2. Time Period Scoring (+25 exact, +15 any/flexible)
        pref_times = [t.strip().capitalize() for t in candidate.preferred_time_periods]
        if not pref_times or "Any" in pref_times:
            breakdown["time_match"] = 15
        elif slot.time_period.capitalize() in pref_times:
            breakdown["time_match"] = 25
        else:
            breakdown["time_match"] = 0

        # 3. Waitlist FIFO Seniority (+25 top, decrements by 5 down to 5)
        # fifo_rank is 0-indexed (0 = joined first)
        seniority_score = max(5, 25 - (fifo_rank * 5))
        breakdown["fifo_seniority"] = seniority_score

        # 4. History Fairness (+25 for 0 declined, +15 for 1, +5 for 2+)
        if candidate.declined_offers_count == 0:
            breakdown["history_fairness"] = 25
        elif candidate.declined_offers_count == 1:
            breakdown["history_fairness"] = 15
        else:
            breakdown["history_fairness"] = 5

        total_score = sum(breakdown.values())

        explanation = (
            f"Score: {total_score} pts [Day: +{breakdown['day_match']}, "
            f"Time: +{breakdown['time_match']}, Seniority: +{breakdown['fifo_seniority']}, "
            f"History: +{breakdown['history_fairness']}]"
        )

        return {
            "total_score": total_score,
            "breakdown": breakdown,
            "explanation": explanation,
        }

    @classmethod
    def rank_candidates(
        cls,
        candidates: List[CandidateInput],
        slot: SlotContext,
    ) -> List[Dict[str, Any]]:
        """Ranks eligible candidates deterministically using scores and strict tie-breaking rules.

        Tie-breaking hierarchy:
        1. Higher total score
        2. Earlier joined_at timestamp (FIFO)
        3. Fewer prior declined offers
        4. Lower patient_id ascending
        """
        if not candidates:
            return []

        # Sort initially by joined_at to establish FIFO seniority ranks
        sorted_by_entry = sorted(candidates, key=lambda c: c.joined_at)

        scored_candidates = []
        for rank_idx, candidate in enumerate(sorted_by_entry):
            # Check eligibility: if preferred days specified and slot day not matched, score is 0
            pref_days = [d.strip().capitalize() for d in candidate.preferred_days]
            is_eligible_day = not pref_days or "Any" in pref_days or slot.day_of_week.capitalize() in pref_days

            if not is_eligible_day:
                continue  # Disqualified if specific day requested does not match

            score_data = cls.calculate_score(candidate, slot, rank_idx)
            scored_candidates.append({
                "waitlist_id": candidate.waitlist_id,
                "patient_id": candidate.patient_id,
                "patient_name": candidate.patient_name,
                "joined_at": candidate.joined_at.isoformat(),
                "total_score": score_data["total_score"],
                "breakdown": score_data["breakdown"],
                "explanation": score_data["explanation"],
                "_candidate_obj": candidate,
            })

        # Apply multi-tier deterministic sorting:
        # (-total_score, joined_at, declined_count, patient_id)
        ranked = sorted(
            scored_candidates,
            key=lambda x: (
                -x["total_score"],
                x["_candidate_obj"].joined_at,
                x["_candidate_obj"].declined_offers_count,
                x["_candidate_obj"].patient_id,
            ),
        )

        # Remove internal candidate object and add rank position
        result = []
        for i, item in enumerate(ranked):
            del item["_candidate_obj"]
            item["rank"] = i + 1
            result.append(item)

        return result


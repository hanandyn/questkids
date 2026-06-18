"""Pydantic schemas for family goals, cheers, recap, and insights."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


# --- Family Goals ---

class FamilyGoalCreate(BaseModel):
    name: str
    description: Optional[str] = None
    target_completion_rate: float
    target_streak: int = 0
    starts_at: datetime
    ends_at: datetime
    reward_description: Optional[str] = None


class FamilyGoalResponse(BaseModel):
    id: int
    family_id: int
    name: str
    description: Optional[str] = None
    target_completion_rate: float
    target_streak: int
    starts_at: datetime
    ends_at: datetime
    reward_description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class FamilyGoalStatusResponse(BaseModel):
    goal: FamilyGoalResponse
    current_completion_rate: float
    current_streak: int
    weeks_progress: list[dict]  # [{week_start, completion_rate, achieved}]
    is_achieved: bool
    days_remaining: int


# --- Cheers ---

class CheerCreate(BaseModel):
    to_child_id: int
    task_instance_id: Optional[int] = None
    message_type: str  # clap, celebrate, lightning, muscle, star


class CheerResponse(BaseModel):
    id: int
    from_child_id: int
    from_child_name: Optional[str] = None
    to_child_id: int
    task_instance_id: Optional[int] = None
    message_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CheersReceived(BaseModel):
    cheers: list[CheerResponse]
    today_count: int
    max_daily: int = 3


# --- Weekly Recap ---

class PerChildRecap(BaseModel):
    child_id: int
    display_name: str
    level: int
    avatar_config: Optional[str] = None
    tasks_completed: int
    tasks_total: int
    completion_rate: float
    points_earned: int
    achievements_unlocked: list[str]
    streak_days: int
    longest_streak: int
    stars_change: int
    gems_change: int


class FamilyRecapHighlights(BaseModel):
    top_performer_name: str
    top_performer_id: int
    top_performer_rate: float
    most_improved_name: Optional[str] = None
    most_improved_id: Optional[int] = None
    most_improved_change: float = 0.0
    longest_streak_name: Optional[str] = None
    longest_streak_value: int = 0


class WeeklyRecapResponse(BaseModel):
    week_start: date
    week_end: date
    family_completion_rate: float
    total_tasks_completed: int
    total_points_earned: int
    children_recap: list[PerChildRecap]
    highlights: FamilyRecapHighlights
    tips: list[str]


# --- Insights / Tips ---

class TipCard(BaseModel):
    tip_type: str  # difficulty, timing, streak, redemption, pattern, handicap
    message: str
    child_id: Optional[int] = None
    child_name: Optional[str] = None
    severity: str = "info"  # info, warning, success


class InsightsResponse(BaseModel):
    tips: list[TipCard]
    stats: dict  # flexible stats container


# --- Leaderboard Enhanced ---

class RankChange(BaseModel):
    child_id: int
    rank_change: int  # negative = improved (moved up)
    previous_stars: int


class EnhancedLeaderboardEntry(BaseModel):
    child_id: int
    display_name: str
    level: int
    stars: int
    adjusted_stars: int  # with handicap applied
    gems: int
    current_streak: int
    completion_rate: float
    xp_this_week: int
    age_tier: Optional[int] = None
    avatar_config: Optional[str] = None
    handicap_multiplier: int
    rank: int
    rank_change: int = 0  # 0 = no change, negative = up, positive = down


class EnhancedLeaderboardResponse(BaseModel):
    leaderboard: list[EnhancedLeaderboardEntry]
    most_improved: Optional[EnhancedLeaderboardEntry] = None
    longest_streak_entry: Optional[EnhancedLeaderboardEntry] = None
    leaderboard_period: str  # "all_time", "weekly", "monthly"

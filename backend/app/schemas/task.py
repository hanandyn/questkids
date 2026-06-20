"""Pydantic schemas for task models."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TaskTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    task_type: str = "one_shot"  # timed, checklist, one_shot, streak, bonus, team
    base_points: int = 10
    timer_duration: Optional[int] = None
    pomodoro_cycles: Optional[int] = None
    break_duration: Optional[int] = None
    subtasks: Optional[list[dict]] = None
    all_complete_bonus: int = 0
    max_asks: int = 2
    bonus_first_ask: int = 10
    penalty_per_ask: int = -5
    early_finish_bonus_per_min: int = 2
    overstay_penalty_per_min: int = -5
    schedule_type: str = "daily"
    schedule_days: Optional[List[int]] = None
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    age_tier_min: int = 1
    age_tier_max: int = 5
    requires_photo: bool = False
    requires_approval: bool = False
    icon: Optional[str] = None  # emoji or icon name for pre-readers
    audio_prompt: Optional[str] = None  # TTS text for voice guidance
    assigned_child_ids: Optional[List[int]] = None  # kids assigned to this task
    public: bool = False  # share to marketplace


class TaskTemplateUpdate(BaseModel):
    """Partial update for a task template."""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    task_type: Optional[str] = None
    base_points: Optional[int] = None
    timer_duration: Optional[int] = None
    pomodoro_cycles: Optional[int] = None
    break_duration: Optional[int] = None
    subtasks: Optional[list[dict]] = None
    all_complete_bonus: Optional[int] = None
    max_asks: Optional[int] = None
    bonus_first_ask: Optional[int] = None
    penalty_per_ask: Optional[int] = None
    early_finish_bonus_per_min: Optional[int] = None
    overstay_penalty_per_min: Optional[int] = None
    schedule_type: Optional[str] = None
    schedule_days: Optional[List[int]] = None
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    age_tier_min: Optional[int] = None
    age_tier_max: Optional[int] = None
    requires_photo: Optional[bool] = None
    requires_approval: Optional[bool] = None
    icon: Optional[str] = None
    audio_prompt: Optional[str] = None
    assigned_kids: Optional[List[int]] = None  # null = all kids, list = specific kids


class TaskTemplateMarketplaceFilter(BaseModel):
    age_tier: Optional[int] = None
    category: Optional[str] = None
    task_type: Optional[str] = None
    search: Optional[str] = None
    sort_by: str = "rating"  # rating, newest, popular


class TemplateRateRequest(BaseModel):
    rating: int = 5  # 1-5


class TaskTemplateResponse(BaseModel):
    id: int
    family_id: int
    created_by_id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    task_type: str
    base_points: int
    timer_duration: Optional[int] = None
    pomodoro_cycles: Optional[int] = None
    break_duration: Optional[int] = None
    subtasks: Optional[list] = None
    all_complete_bonus: int
    max_asks: int
    bonus_first_ask: int
    penalty_per_ask: int
    early_finish_bonus_per_min: int
    overstay_penalty_per_min: int
    schedule_type: str
    schedule_days: Optional[list] = None
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    age_tier_min: int
    age_tier_max: int
    requires_photo: bool
    requires_approval: bool
    icon: Optional[str] = None
    audio_prompt: Optional[str] = None
    is_active: bool
    public: bool = False
    community_rating: int = 0
    community_ratings_count: int = 0
    created_at: Optional[datetime] = None
    assigned_kids: Optional[list] = None  # list of child IDs, or null for all kids

    model_config = {"from_attributes": True}


class TaskInstanceResponse(BaseModel):
    id: int
    template_id: int
    child_id: int
    date: Optional[datetime] = None
    status: str
    timer_started_at: Optional[datetime] = None
    timer_ended_at: Optional[datetime] = None
    asks_count: int
    points_earned: int
    bonus_points: int
    penalty_points: int
    photo_url: Optional[str] = None
    parent_approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    template: Optional[TaskTemplateResponse] = None
    # Phase 2 extras
    gems_earned: Optional[int] = None
    leveled_up: Optional[bool] = None
    new_level: Optional[int] = None
    new_achievements: Optional[list[dict]] = None
    chest_available: Optional[bool] = None

    model_config = {"from_attributes": True}


class TimerStartRequest(BaseModel):
    task_instance_id: int


class TimerCompleteRequest(BaseModel):
    task_instance_id: int
    elapsed_seconds: int  # how long the child actually took


class TaskApproveRequest(BaseModel):
    approved: bool
    notes: Optional[str] = None


class TaskStatusUpdateRequest(BaseModel):
    """Parent updates a task instance status."""
    status: str  # pending, in_progress, completed, missed, skipped
    notes: Optional[str] = None


class AssignTemplateRequest(BaseModel):
    """Parent assigns a template to specific kids."""
    child_ids: list[int]


class ManualTaskCreateRequest(BaseModel):
    """Parent manually creates a task instance for a specific kid."""
    template_id: int
    child_id: int
    date: Optional[datetime] = None


class PhotoUploadResponse(BaseModel):
    photo_url: str
    message: str = "Photo uploaded successfully"


class PendingApprovalResponse(BaseModel):
    id: int
    template_name: str
    child_name: str
    child_id: int
    photo_url: Optional[str] = None
    completed_at: Optional[datetime] = None
    status: str

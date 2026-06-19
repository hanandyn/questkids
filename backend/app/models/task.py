"""Task template and instance models."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class TaskTemplate(Base):
    __tablename__ = "task_templates"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    category = Column(String, nullable=True)  # hygiene, homework, chores, etc.
    task_type = Column(String, nullable=False)  # timed, checklist, one_shot, streak, bonus, team
    base_points = Column(Integer, default=10)
    timer_duration = Column(Integer, nullable=True)  # seconds, for timed tasks
    pomodoro_cycles = Column(Integer, nullable=True)  # for homework mode
    break_duration = Column(Integer, nullable=True)  # seconds between pomodoros
    subtasks = Column(JSON, nullable=True)  # list of {name, points} for checklist
    all_complete_bonus = Column(Integer, default=0)  # bonus points for checklist all-done
    
    # Compliance settings
    max_asks = Column(Integer, default=2)
    bonus_first_ask = Column(Integer, default=10)
    penalty_per_ask = Column(Integer, default=-5)
    
    # Scoring modifiers
    early_finish_bonus_per_min = Column(Integer, default=2)
    overstay_penalty_per_min = Column(Integer, default=-5)
    
    # Schedule
    schedule_type = Column(String, default="daily")  # daily, weekly, weekdays, every_n_days, nth_weekday, monthly, custom_cron
    schedule_days = Column(JSON, nullable=True)  # [0,1,2,3,4,5,6] for custom
    schedule_every_n_days = Column(Integer, nullable=True)  # for every_n_days
    schedule_nth_weekday = Column(JSON, nullable=True)  # {"n": 2, "weekday": 1} for 2nd Tuesday
    schedule_monthly_day = Column(Integer, nullable=True)  # 1-31 for monthly
    schedule_cron = Column(String, nullable=True)  # cron expression
    time_window_start = Column(String, nullable=True)  # "07:00"
    time_window_end = Column(String, nullable=True)  # "08:00"
    skip_on_holidays = Column(Boolean, default=False)  # school/holiday awareness
    
    # Template marketplace
    public = Column(Boolean, default=False)  # shared to marketplace
    community_rating = Column(Integer, default=0)  # total rating score
    community_ratings_count = Column(Integer, default=0)  # number of ratings
    
    # Other settings
    age_tier_min = Column(Integer, default=1)
    age_tier_max = Column(Integer, default=5)
    requires_photo = Column(Boolean, default=False)
    requires_approval = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family = relationship("Family", back_populates="tasks")
    instances = relationship("TaskInstance", back_populates="template")


class TaskInstance(Base):
    __tablename__ = "task_instances"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("task_templates.id"), nullable=False)
    child_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="pending")  # pending, in_progress, completed, missed, skipped
    timer_started_at = Column(DateTime(timezone=True), nullable=True)
    timer_ended_at = Column(DateTime(timezone=True), nullable=True)
    asks_count = Column(Integer, default=0)
    points_earned = Column(Integer, default=0)
    bonus_points = Column(Integer, default=0)
    penalty_points = Column(Integer, default=0)
    photo_url = Column(Text, nullable=True)
    parent_approved_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    template = relationship("TaskTemplate", back_populates="instances")
    child = relationship("User", back_populates="task_instances")

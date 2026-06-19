"""User model — represents parents and children in a family."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)  # nullable for child accounts
    username = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "parent" or "child"
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)

    # Child-specific fields
    age_tier = Column(Integer, nullable=True)  # 1-5
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    stars = Column(Integer, default=0)
    gems = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    freeze_tokens = Column(Integer, default=0)
    avatar_config = Column(String, nullable=True)  # JSON string
    theme_preference = Column(String, nullable=True)
    handicap_multiplier = Column(Integer, default=100)  # percentage, 100 = no handicap
    last_daily_spin = Column(DateTime(timezone=True), nullable=True)
    completed_since_last_chest = Column(Integer, default=0)
    total_tasks_completed = Column(Integer, default=0)  # denormalized for achievement tracking
    email_verified = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family = relationship("Family", back_populates="members", foreign_keys=[family_id])
    task_instances = relationship("TaskInstance", back_populates="child")
    reward_redemptions = relationship("RewardRedemption", back_populates="child")
    achievements = relationship("ChildAchievement", back_populates="child")


class Family(Base):
    __tablename__ = "families"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    competition_mode = Column(String, default="friendly")  # friendly, competitive, team
    shabbat_mode = Column(Boolean, default=False)
    shabbat_start_time = Column(String, nullable=True)  # e.g. "18:30" per locale
    shabbat_end_time = Column(String, nullable=True)     # e.g. "19:45"
    shabbat_auto_detect = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    members = relationship("User", back_populates="family", foreign_keys="User.family_id")
    tasks = relationship("TaskTemplate", back_populates="family")
    rewards = relationship("Reward", back_populates="family")

"""FamilyGoal model — family-wide goals with progress tracking."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class FamilyGoal(Base):
    __tablename__ = "family_goals"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    target_completion_rate = Column(Float, nullable=False)  # e.g. 80.0 for 80%
    target_streak = Column(Integer, default=0)  # 0 = no streak target
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    reward_description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    progress_entries = relationship("FamilyGoalProgress", back_populates="goal")


class FamilyGoalProgress(Base):
    __tablename__ = "family_goal_progress"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("family_goals.id"), nullable=False)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    week_start = Column(Date, nullable=False)
    completion_rate = Column(Float, nullable=False)  # 0-100
    achieved = Column(Boolean, default=False)

    goal = relationship("FamilyGoal", back_populates="progress_entries")

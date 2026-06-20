"""Reward request model — kids ask parents for new rewards."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class RewardRequest(Base):
    __tablename__ = "reward_requests"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    child_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    suggested_cost_stars = Column(Integer, default=0)
    category = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, approved, rejected
    parent_notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    child = relationship("User", foreign_keys=[child_id])
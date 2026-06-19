"""Reward and redemption models."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    category = Column(String, nullable=True)  # digital_fun, food, privileges, experiences, etc.
    cost_stars = Column(Integer, default=0)
    cost_gems = Column(Integer, default=0)
    age_min = Column(Integer, default=3)
    age_max = Column(Integer, default=18)
    availability = Column(String, default="always")  # always, weekends, special
    limit_per_week = Column(Integer, default=0)  # 0 = unlimited
    requires_approval = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    image_url = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family = relationship("Family", back_populates="rewards")
    redemptions = relationship("RewardRedemption", back_populates="reward")


class RewardRedemption(Base):
    __tablename__ = "reward_redemptions"

    id = Column(Integer, primary_key=True, index=True)
    reward_id = Column(Integer, ForeignKey("rewards.id"), nullable=False)
    child_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")  # pending, approved, fulfilled, rejected
    redeemed_at = Column(DateTime(timezone=True), server_default=func.now())
    fulfilled_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String, nullable=True)  # parent notes on fulfillment

    # Relationships
    reward = relationship("Reward", back_populates="redemptions")
    child = relationship("User", back_populates="reward_redemptions")

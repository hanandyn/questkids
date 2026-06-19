"""Notification model for push notifications."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.sql import func

from ..core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    type = Column(String, nullable=False)  # streak_risk, milestone, leaderboard, achievement, system
    read = Column(Boolean, default=False)
    link = Column(String, nullable=True)  # optional frontend route
    created_at = Column(DateTime(timezone=True), server_default=func.now())

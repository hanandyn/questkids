"""Cheer model — sibling encouragement system."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class Cheer(Base):
    __tablename__ = "cheers"

    id = Column(Integer, primary_key=True, index=True)
    from_child_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    to_child_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_instance_id = Column(Integer, ForeignKey("task_instances.id"), nullable=True)
    message_type = Column(String, nullable=False)  # clap, celebrate, lightning, muscle, star
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    from_child = relationship("User", foreign_keys=[from_child_id])
    to_child = relationship("User", foreign_keys=[to_child_id])

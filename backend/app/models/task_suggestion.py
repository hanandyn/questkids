"""Task suggestion model — AI-powered task optimization suggestions."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class TaskSuggestion(Base):
    __tablename__ = "task_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    child_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    suggestion_type = Column(String, nullable=False)  # timer, difficulty, schedule, new_task, pricing
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    reason = Column(String, nullable=True)  # explanation of why
    related_task_id = Column(Integer, ForeignKey("task_templates.id"), nullable=True)
    suggested_change = Column(String, nullable=True)  # JSON: what to change
    status = Column(String, default="pending")  # pending, applied, dismissed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    family = relationship("Family")
    child = relationship("User")
    related_task = relationship("TaskTemplate")

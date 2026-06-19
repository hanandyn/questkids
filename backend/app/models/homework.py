"""HomeworkAssignment model for school integration."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class HomeworkAssignment(Base):
    __tablename__ = "homework_assignments"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    child_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String, nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    points = Column(Integer, default=20)
    status = Column(String, default="assigned")  # assigned, completed, overdue
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="assignments")
    teacher = relationship("User", foreign_keys=[teacher_id])
    child = relationship("User", foreign_keys=[child_id])

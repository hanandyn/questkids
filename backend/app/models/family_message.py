"""Family message model — communication within a family."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class FamilyMessage(Base):
    __tablename__ = "family_messages"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null for system messages
    message = Column(String, nullable=False)
    type = Column(String, default="cheer")  # announcement, cheer, reminder, system
    pinned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    family = relationship("Family")
    sender = relationship("User")

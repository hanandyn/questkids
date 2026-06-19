"""Daily ritual model — time-of-day contextual experiences."""

from sqlalchemy import Column, Integer, String, Boolean, Time, ForeignKey
from sqlalchemy.orm import relationship

from ..core.database import Base


class DailyRitual(Base):
    __tablename__ = "daily_rituals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    ritual_type = Column(String, nullable=False)  # morning, after_school, evening, weekend
    time_window_start = Column(Time, nullable=True)
    time_window_end = Column(Time, nullable=True)
    enabled = Column(Boolean, default=True)

    user = relationship("User")

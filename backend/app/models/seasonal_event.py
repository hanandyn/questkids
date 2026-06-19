"""SeasonalEvent model for themed events system."""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float
from sqlalchemy.sql import func

from ..core.database import Base


class SeasonalEvent(Base):
    __tablename__ = "seasonal_events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    theme = Column(String, nullable=False)  # CSS theme class name
    description = Column(String, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    bonus_multiplier = Column(Float, default=1.0)  # 1.5 = 50% bonus points
    special_badge_name = Column(String, nullable=True)  # badge awarded during event
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

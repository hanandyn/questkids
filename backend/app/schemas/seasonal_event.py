"""Pydantic schemas for seasonal events."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SeasonalEventResponse(BaseModel):
    id: int
    name: str
    theme: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    bonus_multiplier: float
    special_badge_name: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class ActiveEventsResponse(BaseModel):
    events: list[SeasonalEventResponse]
    has_active: bool

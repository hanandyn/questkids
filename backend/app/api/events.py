"""Seasonal events API routes."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..models.seasonal_event import SeasonalEvent
from ..schemas.seasonal_event import SeasonalEventResponse, ActiveEventsResponse

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/active", response_model=ActiveEventsResponse)
async def get_active_events(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get currently active seasonal events."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(SeasonalEvent).where(
            and_(
                SeasonalEvent.is_active == True,
                SeasonalEvent.start_date <= now,
                SeasonalEvent.end_date >= now,
            )
        )
    )
    events = result.scalars().all()
    return ActiveEventsResponse(
        events=[SeasonalEventResponse.model_validate(e) for e in events],
        has_active=len(events) > 0,
    )

"""Daily rituals API endpoints — time-of-day contextual experiences."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from sqlalchemy import select
from datetime import datetime, timezone, time

from ..core.database import get_db
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User
from ..models.daily_ritual import DailyRitual

router = APIRouter(prefix="/settings", tags=["rituals"])

VALID_RITUAL_TYPES = ["morning", "after_school", "evening", "weekend"]


class RitualData(BaseModel):
    ritual_type: str
    time_window_start: str | None = None  # "HH:MM"
    time_window_end: str | None = None
    enabled: bool = True


@router.get("/rituals", response_model=list[RitualData])
async def get_rituals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get daily ritual settings for the current user (kid gets their own)."""
    result = await db.execute(
        select(DailyRitual).where(DailyRitual.user_id == current_user.id)
    )
    rituals = result.scalars().all()

    out = []
    for r in rituals:
        out.append(RitualData(
            ritual_type=r.ritual_type,
            time_window_start=r.time_window_start.strftime("%H:%M") if r.time_window_start else None,
            time_window_end=r.time_window_end.strftime("%H:%M") if r.time_window_end else None,
            enabled=r.enabled,
        ))
    return out


@router.put("/rituals", response_model=list[RitualData])
async def update_rituals(
    data: list[RitualData],
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Update rituals for all children in the family. Parent only."""
    # Validate input
    for ritual in data:
        if ritual.ritual_type not in VALID_RITUAL_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid ritual type: {ritual.ritual_type}")

    # Get all children in the family
    children_result = await db.execute(
        select(User).where(User.family_id == current_user.family_id, User.role == "child")
    )
    children = children_result.scalars().all()
    if not children:
        raise HTTPException(status_code=400, detail="No children in family")

    # For simplicity, sync rituals across all children
    for child in children:
        for ritual_d in data:
            # Parse time strings
            ts = None
            te = None
            if ritual_d.time_window_start:
                try:
                    h, m = ritual_d.time_window_start.split(":")
                    ts = time(int(h), int(m))
                except (ValueError, TypeError):
                    pass
            if ritual_d.time_window_end:
                try:
                    h, m = ritual_d.time_window_end.split(":")
                    te = time(int(h), int(m))
                except (ValueError, TypeError):
                    pass

            # Upsert ritual for this child
            result = await db.execute(
                select(DailyRitual).where(
                    DailyRitual.user_id == child.id,
                    DailyRitual.ritual_type == ritual_d.ritual_type,
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                existing.time_window_start = ts
                existing.time_window_end = te
                existing.enabled = ritual_d.enabled
            else:
                db.add(DailyRitual(
                    user_id=child.id,
                    ritual_type=ritual_d.ritual_type,
                    time_window_start=ts,
                    time_window_end=te,
                    enabled=ritual_d.enabled,
                ))

    await db.commit()
    return await get_rituals_for_first_child(current_user, db)


async def get_rituals_for_first_child(current_user: User, db: AsyncSession):
    """Helper: return rituals for first child in family."""
    children_result = await db.execute(
        select(User).where(User.family_id == current_user.family_id, User.role == "child")
    )
    children = children_result.scalars().all()
    if not children:
        return []

    result = await db.execute(
        select(DailyRitual).where(DailyRitual.user_id == children[0].id)
    )
    rituals = result.scalars().all()
    return [
        RitualData(
            ritual_type=r.ritual_type,
            time_window_start=r.time_window_start.strftime("%H:%M") if r.time_window_start else None,
            time_window_end=r.time_window_end.strftime("%H:%M") if r.time_window_end else None,
            enabled=r.enabled,
        )
        for r in rituals
    ]


@router.get("/rituals/status")
async def get_ritual_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current ritual status for the user — which ritual type is active now."""
    if current_user.role != "child":
        return {"active_ritual": None, "message": None}

    now = datetime.now(timezone.utc)
    now_time = time(now.hour, now.minute)
    weekday = now.weekday()

    result = await db.execute(
        select(DailyRitual).where(
            DailyRitual.user_id == current_user.id,
            DailyRitual.enabled == True,
        )
    )
    rituals = result.scalars().all()

    for ritual in rituals:
        if ritual.ritual_type == "weekend" and weekday >= 5:
            if ritual.time_window_start is None or now_time >= ritual.time_window_start:
                if ritual.time_window_end is None or now_time <= ritual.time_window_end:
                    return {"active_ritual": "weekend", "message": "Weekend vibes! 🌟"}
        elif ritual.ritual_type == "morning" and 7 <= now.hour <= 9:
            return {"active_ritual": "morning", "message": "Good morning! Ready for today's quests?"}
        elif ritual.ritual_type == "after_school" and 14 <= now.hour <= 16:
            return {"active_ritual": "after_school", "message": "Time for your after-school challenges!"}
        elif ritual.ritual_type == "evening" and 18 <= now.hour <= 20:
            return {"active_ritual": "evening", "message": "Wrapping up! Any tasks left?"}

    return {"active_ritual": None, "message": None}

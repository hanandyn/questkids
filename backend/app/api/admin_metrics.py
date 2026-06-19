"""Admin metrics endpoints — parent-only production monitoring."""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..core.database import get_db
from ..core.auth import get_current_parent
from ..models.user import User, Family
from ..models.task import TaskInstance

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics")
async def admin_metrics(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Get production metrics (parent only)."""
    # Total users
    user_count_result = await db.execute(select(func.count(User.id)))
    user_count = user_count_result.scalar() or 0

    # Total families
    family_count_result = await db.execute(select(func.count(Family.id)))
    family_count = family_count_result.scalar() or 0

    # Tasks completed today (UTC)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    tasks_today_result = await db.execute(
        select(func.count(TaskInstance.id)).where(
            TaskInstance.status == "completed",
            TaskInstance.timer_ended_at >= today_start,
            TaskInstance.timer_ended_at < today_end,
        )
    )
    tasks_today = tasks_today_result.scalar() or 0

    # Active streaks (children with current_streak > 0)
    active_streaks_result = await db.execute(
        select(func.count(User.id)).where(
            User.role == "child",
            User.current_streak > 0,
        )
    )
    active_streaks = active_streaks_result.scalar() or 0

    # User breakdown
    parents_result = await db.execute(
        select(func.count(User.id)).where(User.role == "parent")
    )
    children_result = await db.execute(
        select(func.count(User.id)).where(User.role == "child")
    )

    return {
        "user_count": user_count,
        "parent_count": parents_result.scalar() or 0,
        "child_count": children_result.scalar() or 0,
        "family_count": family_count,
        "tasks_completed_today": tasks_today,
        "active_streaks": active_streaks,
    }

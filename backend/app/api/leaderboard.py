"""Leaderboard API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..services.leaderboard import (
    get_family_leaderboard, get_enhanced_leaderboard, get_child_all_time_stats,
)
from ..services.streaks import get_streak_info
from ..schemas.stats import FamilyStats
from ..schemas.social import EnhancedLeaderboardResponse

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=FamilyStats)
async def get_leaderboard(
    period: str = Query("all_time", description="all_time, weekly, monthly"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the family leaderboard."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")

    leaderboard = await get_family_leaderboard(db, current_user.family_id, period)

    total_rates = [e["completion_rate"] for e in leaderboard]
    family_rate = sum(total_rates) / len(total_rates) if total_rates else 0

    top = leaderboard[0] if leaderboard else None

    return FamilyStats(
        family_completion_rate=round(family_rate, 1),
        total_tasks_assigned=0,
        total_tasks_completed=0,
        top_performer_id=top["child_id"] if top else None,
        top_performer_name=top["display_name"] if top else None,
        leaderboard=leaderboard,
    )


@router.get("/enhanced", response_model=EnhancedLeaderboardResponse)
async def get_enhanced_leaderboard_route(
    period: str = Query("all_time", description="all_time, weekly, monthly"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get enhanced leaderboard with handicap, rank changes, and highlights."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")

    result = await get_enhanced_leaderboard(db, current_user.family_id, period)
    return EnhancedLeaderboardResponse(**result)


@router.get("/child/{child_id}/streak")
async def get_child_streak(
    child_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get streak information for a child."""
    from sqlalchemy import select
    child_result = await db.execute(select(User).where(User.id == child_id))
    child = child_result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    return await get_streak_info(db, child)

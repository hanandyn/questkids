"""Weekly Recap and Insights API routes."""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..schemas.social import WeeklyRecapResponse, InsightsResponse, TipCard
from ..services.weekly_recap import generate_weekly_recap, generate_kid_recap
from ..services.tips_engine import generate_tips
from ..services.leaderboard import get_family_stats_snapshot

router = APIRouter(tags=["recap"])


@router.get("/recap/weekly", response_model=WeeklyRecapResponse)
async def get_weekly_recap(
    recap_date: date | None = Query(None, description="Date within the week to recap"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get weekly family recap with per-child stats and highlights."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")

    recap_data = await generate_weekly_recap(db, current_user.family_id, recap_date)
    return WeeklyRecapResponse(**recap_data)


@router.get("/recap/weekly/kid")
async def get_kid_weekly_recap(
    recap_date: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get simplified kid-friendly weekly recap."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can view kid recap")

    recap_data = await generate_kid_recap(db, current_user.id, recap_date)
    return recap_data


@router.get("/insights/tips", response_model=list[TipCard])
async def get_insights_tips(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-style smart tips based on family data patterns."""
    if current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can view tips")
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")

    tips = await generate_tips(db, current_user.family_id)
    return [TipCard(**t) for t in tips]


@router.get("/insights/analytics")
async def get_insights_analytics(
    days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get analytics data for the parent insights dashboard."""
    if current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can view analytics")
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")

    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    stats = await get_family_stats_snapshot(db, current_user.family_id, start_date, end_date)
    tips = await generate_tips(db, current_user.family_id)

    return InsightsResponse(
        tips=[TipCard(**t) for t in tips],
        stats=stats,
    )

"""Family Goals API routes — parent creates goals, tracks progress."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..core.database import get_db
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User
from ..models.family_goal import FamilyGoal
from ..schemas.social import FamilyGoalCreate, FamilyGoalResponse, FamilyGoalStatusResponse
from ..services.family_goals import get_goal_status, update_goal_progress

router = APIRouter(prefix="/family-goals", tags=["family-goals"])


@router.post("", response_model=FamilyGoalResponse)
async def create_family_goal(
    data: FamilyGoalCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent creates a family-wide goal."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")

    goal = FamilyGoal(
        family_id=current_user.family_id,
        **data.model_dump(),
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return FamilyGoalResponse.model_validate(goal)


@router.get("", response_model=list[FamilyGoalResponse])
async def list_family_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all family goals for the user's family."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")

    result = await db.execute(
        select(FamilyGoal).where(FamilyGoal.family_id == current_user.family_id)
        .order_by(FamilyGoal.created_at.desc())
    )
    goals = result.scalars().all()
    return [FamilyGoalResponse.model_validate(g) for g in goals]


@router.get("/status", response_model=list[FamilyGoalStatusResponse])
async def get_family_goal_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current progress for all active family goals."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")

    # Check and update progress first
    await update_goal_progress(db, current_user.family_id)

    statuses = await get_goal_status(db, current_user.family_id)
    return [
        FamilyGoalStatusResponse(
            goal=FamilyGoalResponse.model_validate(s["goal"]),
            current_completion_rate=s["current_completion_rate"],
            current_streak=s["current_streak"],
            weeks_progress=s["weeks_progress"],
            is_achieved=s["is_achieved"],
            days_remaining=s["days_remaining"],
        )
        for s in statuses
    ]


@router.delete("/{goal_id}")
async def delete_family_goal(
    goal_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent deactivates a family goal."""
    result = await db.execute(
        select(FamilyGoal).where(
            and_(FamilyGoal.id == goal_id, FamilyGoal.family_id == current_user.family_id)
        )
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal.is_active = False
    await db.commit()
    return {"message": "Goal deactivated"}

"""Family Goals service — create, track, and evaluate family-wide goals."""

from datetime import date, datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User
from ..models.task import TaskInstance, TaskTemplate
from ..models.family_goal import FamilyGoal, FamilyGoalProgress


async def calculate_family_completion_rate(
    db: AsyncSession, family_id: int, week_start: date
) -> float:
    """Calculate family-wide completion rate for a given week."""
    children_result = await db.execute(
        select(User).where(
            and_(User.family_id == family_id, User.role == "child")
        )
    )
    children = children_result.scalars().all()

    if not children:
        return 0.0

    week_end = week_start + timedelta(days=7)
    total_rates = []

    for child in children:
        result = await db.execute(
            select(TaskInstance).where(
                and_(
                    TaskInstance.child_id == child.id,
                    func.date(TaskInstance.created_at) >= week_start,
                    func.date(TaskInstance.created_at) < week_end,
                )
            )
        )
        instances = result.scalars().all()
        total = len(instances)
        completed = len([i for i in instances if i.status == "completed"])
        rate = (completed / total * 100) if total > 0 else 0
        total_rates.append(rate)

    return round(sum(total_rates) / len(total_rates), 1)


async def get_family_completion_rate_for_period(
    db: AsyncSession, family_id: int, start: date, end: date
) -> float:
    """Calculate family completion rate for any date period."""
    children_result = await db.execute(
        select(User).where(
            and_(User.family_id == family_id, User.role == "child")
        )
    )
    children = children_result.scalars().all()
    if not children:
        return 0.0

    rates = []
    for child in children:
        result = await db.execute(
            select(TaskInstance).where(
                and_(
                    TaskInstance.child_id == child.id,
                    func.date(TaskInstance.created_at) >= start,
                    func.date(TaskInstance.created_at) <= end,
                )
            )
        )
        instances = result.scalars().all()
        total = len(instances)
        completed = len([i for i in instances if i.status == "completed"])
        rate = (completed / total * 100) if total > 0 else 0
        rates.append(rate)

    return round(sum(rates) / len(rates), 1)


async def update_goal_progress(db: AsyncSession, family_id: int) -> list[dict]:
    """Check all active goals and update their progress entries. Returns achieved goals."""
    today = date.today()
    monday = today - timedelta(days=today.weekday())

    result = await db.execute(
        select(FamilyGoal).where(
            and_(
                FamilyGoal.family_id == family_id,
                FamilyGoal.is_active == True,
                FamilyGoal.ends_at >= datetime.now(timezone.utc),
            )
        )
    )
    goals = result.scalars().all()

    achieved = []
    for goal in goals:
        # Check if we already have an entry for this week
        existing = await db.execute(
            select(FamilyGoalProgress).where(
                and_(
                    FamilyGoalProgress.goal_id == goal.id,
                    FamilyGoalProgress.week_start == monday,
                )
            )
        )
        if existing.scalar_one_or_none():
            continue

        rate = await calculate_family_completion_rate(db, family_id, monday)
        is_achieved = rate >= goal.target_completion_rate

        entry = FamilyGoalProgress(
            goal_id=goal.id,
            family_id=family_id,
            week_start=monday,
            completion_rate=rate,
            achieved=is_achieved,
        )
        db.add(entry)

        if is_achieved:
            achieved.append({
                "goal_id": goal.id,
                "goal_name": goal.name,
                "reward_description": goal.reward_description,
                "completion_rate": rate,
            })

    if achieved:
        await db.commit()

    return achieved


async def get_goal_status(db: AsyncSession, family_id: int) -> list[dict]:
    """Get status of all active family goals."""
    today = date.today()

    result = await db.execute(
        select(FamilyGoal).where(
            and_(
                FamilyGoal.family_id == family_id,
                FamilyGoal.is_active == True,
            )
        )
    )
    goals = result.scalars().all()

    statuses = []
    for goal in goals:
        # Get progress entries
        progress_result = await db.execute(
            select(FamilyGoalProgress)
            .where(FamilyGoalProgress.goal_id == goal.id)
            .order_by(FamilyGoalProgress.week_start.desc())
        )
        progress = progress_result.scalars().all()

        current_rate = await calculate_family_completion_rate(db, family_id,
            today - timedelta(days=today.weekday()))

        days_remaining = (goal.ends_at.date() - today).days if goal.ends_at else 0

        is_achieved = any(p.achieved for p in progress)

        statuses.append({
            "goal": goal,
            "current_completion_rate": current_rate,
            "current_streak": sum(1 for p in progress if p.achieved),
            "weeks_progress": [
                {
                    "week_start": p.week_start.isoformat(),
                    "completion_rate": p.completion_rate,
                    "achieved": p.achieved,
                }
                for p in progress
            ],
            "is_achieved": is_achieved,
            "days_remaining": max(0, days_remaining),
        })

    return statuses


async def needs_goal_check(db: AsyncSession, family_id: int) -> bool:
    """Check if any active goals need progress checking."""
    today = date.today()
    monday = today - timedelta(days=today.weekday())

    result = await db.execute(
        select(FamilyGoal).where(
            and_(
                FamilyGoal.family_id == family_id,
                FamilyGoal.is_active == True,
                FamilyGoal.ends_at >= datetime.now(timezone.utc),
            )
        )
    )
    goals = result.scalars().all()

    for goal in goals:
        existing = await db.execute(
            select(FamilyGoalProgress).where(
                and_(
                    FamilyGoalProgress.goal_id == goal.id,
                    FamilyGoalProgress.week_start == monday,
                )
            )
        )
        if not existing.scalar_one_or_none():
            return True
    return False

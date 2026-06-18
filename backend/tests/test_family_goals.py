"""Tests for Family Goals service and API."""

import pytest
from datetime import datetime, timedelta, timezone, date

from app.models.user import User, Family
from app.models.family_goal import FamilyGoal, FamilyGoalProgress
from app.services.family_goals import (
    calculate_family_completion_rate,
    update_goal_progress,
    get_goal_status,
)


@pytest.mark.asyncio
async def test_calculate_family_completion_rate_empty(db_session):
    """Family with no children should return 0."""
    rate = await calculate_family_completion_rate(db_session, 999, date.today())
    assert rate == 0.0


@pytest.mark.asyncio
async def test_create_family_goal(db_session):
    """Test creating a family goal."""
    family = Family(name="Test Fam")
    db_session.add(family)
    await db_session.flush()

    goal = FamilyGoal(
        family_id=family.id,
        name="Clean Week",
        description="Family cleans together",
        target_completion_rate=80.0,
        target_streak=0,
        starts_at=datetime.now(timezone.utc),
        ends_at=datetime.now(timezone.utc) + timedelta(days=7),
        reward_description="Pizza night",
        is_active=True,
    )
    db_session.add(goal)
    await db_session.commit()

    assert goal.id is not None
    assert goal.name == "Clean Week"
    assert goal.target_completion_rate == 80.0
    assert goal.reward_description == "Pizza night"


@pytest.mark.asyncio
async def test_family_goal_progress(db_session):
    """Test recording goal progress."""
    family = Family(name="Progress Fam")
    db_session.add(family)
    await db_session.flush()

    goal = FamilyGoal(
        family_id=family.id,
        name="Week Goal",
        description="Complete 80%",
        target_completion_rate=80.0,
        starts_at=datetime.now(timezone.utc),
        ends_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(goal)
    await db_session.flush()

    monday = date.today() - timedelta(days=date.today().weekday())
    progress = FamilyGoalProgress(
        goal_id=goal.id,
        family_id=family.id,
        week_start=monday,
        completion_rate=85.0,
        achieved=True,
    )
    db_session.add(progress)
    await db_session.commit()

    assert progress.achieved == True
    assert progress.completion_rate == 85.0


@pytest.mark.asyncio
async def test_get_goal_status_no_goals(db_session):
    """Test getting goal status when no goals exist."""
    statuses = await get_goal_status(db_session, 999)
    assert statuses == []

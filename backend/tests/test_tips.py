"""Tests for the tips engine."""

import pytest
from datetime import date, timedelta

from app.models.user import User, Family
from app.models.task import TaskTemplate, TaskInstance
from app.services.tips_engine import generate_tips


@pytest.mark.asyncio
async def test_generate_tips_empty_family(db_session):
    """Test tips generation with no children."""
    family = Family(name="Empty Fam")
    db_session.add(family)
    await db_session.flush()

    tips = await generate_tips(db_session, family.id)
    assert tips == []


@pytest.mark.asyncio
async def test_generate_tips_with_children(db_session):
    """Test tips generation with children who have tasks."""
    family = Family(name="Tips Fam")
    db_session.add(family)
    await db_session.flush()

    child = User(
        username="tips_kid",
        display_name="Tips Kid",
        hashed_password="hash",
        role="child",
        family_id=family.id,
        stars=100,
    )
    db_session.add(child)
    await db_session.flush()

    # Add a task template and missed instances
    template = TaskTemplate(
        family_id=family.id,
        created_by_id=1,  # non-existent parent for test
        name="Morning Routine",
        task_type="one_shot",
        base_points=10,
    )
    db_session.add(template)
    await db_session.flush()

    # Create 3 missed task instances in last 2 weeks
    from datetime import datetime, timezone
    for i in range(3):
        inst = TaskInstance(
            template_id=template.id,
            child_id=child.id,
            status="missed",
            created_at=datetime.now(timezone.utc) - timedelta(days=i * 2),
        )
        db_session.add(inst)
    await db_session.commit()

    tips = await generate_tips(db_session, family.id)
    assert len(tips) >= 1

    # Should find the missed tasks tip
    difficulty_tips = [t for t in tips if t["tip_type"] == "difficulty"]
    assert len(difficulty_tips) >= 1
    assert "Tips Kid" in difficulty_tips[0]["message"]
    assert "Morning Routine" in difficulty_tips[0]["message"]


@pytest.mark.asyncio
async def test_handicap_tip(db_session):
    """Test that sibling gap triggers handicap suggestion."""
    family = Family(name="Handicap Fam")
    db_session.add(family)
    await db_session.flush()

    child1 = User(
        username="high_kid",
        display_name="High Kid",
        hashed_password="hash",
        role="child",
        family_id=family.id,
        stars=200,
        handicap_multiplier=100,
    )
    child2 = User(
        username="low_kid",
        display_name="Low Kid",
        hashed_password="hash",
        role="child",
        family_id=family.id,
        stars=50,
        handicap_multiplier=100,
    )
    db_session.add_all([child1, child2])
    await db_session.commit()

    tips = await generate_tips(db_session, family.id)
    handicap_tips = [t for t in tips if t["tip_type"] == "handicap"]
    assert len(handicap_tips) >= 1
    assert "Low Kid" in handicap_tips[0]["message"]

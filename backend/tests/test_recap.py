"""Tests for weekly recap service."""

import pytest
from datetime import date, timedelta

from app.models.user import User, Family
from app.services.weekly_recap import generate_weekly_recap, generate_kid_recap


@pytest.mark.asyncio
async def test_generate_weekly_recap(db_session):
    """Test generating a weekly recap with children."""
    family = Family(name="Recap Fam")
    db_session.add(family)
    await db_session.flush()

    child = User(
        username="recap_kid",
        display_name="Recap Kid",
        hashed_password="hash",
        role="child",
        family_id=family.id,
        stars=50,
        current_streak=3,
        longest_streak=5,
        level=5,
    )
    db_session.add(child)
    await db_session.commit()

    recap = await generate_weekly_recap(db_session, family.id)
    assert recap is not None
    assert "week_start" in recap
    assert "week_end" in recap
    assert "family_completion_rate" in recap
    assert "children_recap" in recap
    assert "highlights" in recap
    assert "tips" in recap

    children = recap["children_recap"]
    assert len(children) == 1
    assert children[0]["display_name"] == "Recap Kid"
    assert children[0]["streak_days"] == 3


@pytest.mark.asyncio
async def test_generate_kid_recap(db_session):
    """Test generating a kid-friendly recap."""
    family = Family(name="KidRecap Fam")
    db_session.add(family)
    await db_session.flush()

    child = User(
        username="kidrecap_kid",
        display_name="Kid Recap Kid",
        hashed_password="hash",
        role="child",
        family_id=family.id,
        stars=100,
        current_streak=5,
    )
    db_session.add(child)
    await db_session.commit()

    recap = await generate_kid_recap(db_session, child.id)
    assert recap is not None
    assert recap["display_name"] == "Kid Recap Kid"
    assert recap["stars"] == 100
    assert recap["streak_days"] == 5
    assert recap["family_rank"] >= 1
    assert "siblings" in recap


@pytest.mark.asyncio
async def test_generate_weekly_recap_no_children(db_session):
    """Test recapping a family with no children."""
    family = Family(name="EmptyRecap")
    db_session.add(family)
    await db_session.commit()

    recap = await generate_weekly_recap(db_session, family.id)
    assert recap["children_recap"] == []
    assert recap["family_completion_rate"] == 0.0


@pytest.mark.asyncio
async def test_generate_kid_recap_not_found(db_session):
    """Test kid recap for non-existent child."""
    recap = await generate_kid_recap(db_session, 99999)
    assert recap == {}

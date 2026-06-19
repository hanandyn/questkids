"""Seed seasonal events into the database."""

from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.seasonal_event import SeasonalEvent


async def seed_seasonal_events(db: AsyncSession):
    """Create default seasonal events if they don't exist."""
    events = [
        {
            "name": "Summer Quest",
            "theme": "summer",
            "description": "Summer break adventures! Complete quests for bonus points!",
            "start_date": datetime(2026, 6, 1, tzinfo=timezone.utc),
            "end_date": datetime(2026, 8, 31, tzinfo=timezone.utc),
            "bonus_multiplier": 1.5,
            "special_badge_name": "Summer Champion",
        },
        {
            "name": "Back to School",
            "theme": "back-to-school",
            "description": "Back to school season! Gear up with fresh quests!",
            "start_date": datetime(2026, 9, 1, tzinfo=timezone.utc),
            "end_date": datetime(2026, 9, 30, tzinfo=timezone.utc),
            "bonus_multiplier": 1.25,
            "special_badge_name": "School Ready",
        },
        {
            "name": "Chanukah Festival",
            "theme": "chanukah",
            "description": "Festival of Lights! Special Chanukah quests await!",
            "start_date": datetime(2026, 12, 4, tzinfo=timezone.utc),
            "end_date": datetime(2026, 12, 12, tzinfo=timezone.utc),
            "bonus_multiplier": 2.0,
            "special_badge_name": "Chanukah Hero",
        },
        {
            "name": "Passover",
            "theme": "passover",
            "description": "Passover season! Complete quests before the Seder!",
            "start_date": datetime(2027, 4, 1, tzinfo=timezone.utc),
            "end_date": datetime(2027, 4, 15, tzinfo=timezone.utc),
            "bonus_multiplier": 1.5,
            "special_badge_name": "Passover Star",
        },
    ]

    for event_data in events:
        existing = await db.execute(
            select(SeasonalEvent).where(SeasonalEvent.name == event_data["name"])
        )
        if not existing.scalar_one_or_none():
            event = SeasonalEvent(**event_data)
            db.add(event)

    await db.commit()

"""Calendar iCal feed API route."""

from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..core.auth import get_current_user, get_parent_or_same_child
from ..models.user import User
from ..models.task import TaskInstance, TaskTemplate
from ..models.reward import RewardRedemption

router = APIRouter(prefix="/calendar", tags=["calendar"])


def escape_ical(text: str) -> str:
    """Escape text for iCal format."""
    if not text:
        return ""
    return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def format_ical_dt(dt: datetime | None) -> str:
    """Format datetime for iCal."""
    if not dt:
        return ""
    return dt.strftime("%Y%m%dT%H%M%SZ")


@router.get("/{child_id}/feed.ics")
async def get_child_calendar_feed(
    child_id: int,
    current_user: User = Depends(get_parent_or_same_child),
    db: AsyncSession = Depends(get_db),
):
    """Generate an iCal feed for a child's scheduled tasks and milestones."""
    # Get child's pending and in-progress tasks
    result = await db.execute(
        select(TaskInstance)
        .where(
            TaskInstance.child_id == child_id,
            TaskInstance.status.in_(["pending", "in_progress"]),
        )
        .join(TaskTemplate, TaskInstance.template_id == TaskTemplate.id)
        .where(TaskTemplate.time_window_start != None)
    )
    instances = result.scalars().all()

    # Get child for display name
    child_result = await db.execute(select(User).where(User.id == child_id))
    child = child_result.scalar_one_or_none()
    child_name = child.display_name if child else f"Child {child_id}"

    now_utc = datetime.now(timezone.utc)
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//QuestKids//Calendar Feed//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:QuestKids - {escape_ical(child_name)}",
        f"X-WR-CALDESC:Quests and milestones for {escape_ical(child_name)}",
    ]

    for instance in instances:
        template = instance.template
        if not template:
            continue

        due_date = instance.date or now_utc
        uid = f"questkids-task-{instance.id}@questkids"

        # Use time window if available
        if template.time_window_start:
            try:
                h, m = map(int, template.time_window_start.split(":"))
                dt_start = due_date.replace(hour=h, minute=m, second=0, microsecond=0)
            except (ValueError, AttributeError):
                dt_start = due_date
        else:
            dt_start = due_date

        # End time from time_window_end or duration
        if template.time_window_end:
            try:
                h, m = map(int, template.time_window_end.split(":"))
                dt_end = due_date.replace(hour=h, minute=m, second=0, microsecond=0)
            except (ValueError, AttributeError):
                dt_end = dt_start + timedelta(minutes=30)
        elif template.timer_duration:
            dt_end = dt_start + timedelta(seconds=template.timer_duration)
        else:
            dt_end = dt_start + timedelta(minutes=30)

        summary = f"🎯 {template.name}"
        description = template.description or ""
        if template.category:
            description = f"[{template.category}] {description}"
        if template.base_points:
            description += f" ({template.base_points} pts)"

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTART:{format_ical_dt(dt_start)}",
            f"DTEND:{format_ical_dt(dt_end)}",
            f"SUMMARY:{escape_ical(summary)}",
            f"DESCRIPTION:{escape_ical(description)}",
            "CATEGORIES:QuestKids,Quest",
            "END:VEVENT",
        ])

    # Add streak milestones
    if child and child.current_streak > 0:
        streak_date = now_utc
        uid = f"questkids-streak-{child_id}@questkids"
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTART:{format_ical_dt(streak_date)}",
            f"DTEND:{format_ical_dt(streak_date + timedelta(minutes=15))}",
            f"SUMMARY:🔥 Keep Streak Alive! ({child.current_streak} days)",
            "DESCRIPTION:Keep your streak going! Complete a quest today.",
            "CATEGORIES:QuestKids,Streak",
            "END:VEVENT",
        ])

    lines.append("END:VCALENDAR")

    ical_content = "\r\n".join(lines)
    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=questkids-{child_id}.ics",
            "Cache-Control": "no-cache",
        },
    )

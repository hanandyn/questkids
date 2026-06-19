"""Analytics service — advanced insights and export."""

import csv
import io
from datetime import date, timedelta, datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text

from ..models.task import TaskTemplate, TaskInstance
from ..models.user import User
from ..models.reward import Reward, RewardRedemption


async def get_child_trends(db: AsyncSession, child_id: int, days: int = 30):
    """Get completion trends for a child."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    # Daily completion stats
    result = await db.execute(
        select(
            TaskInstance.date,
            func.count(TaskInstance.id).label("total"),
            func.count().filter(TaskInstance.status == "completed").label("completed"),
            func.sum(TaskInstance.points_earned).label("points"),
        )
        .where(
            TaskInstance.child_id == child_id,
            TaskInstance.date >= start_date,
            TaskInstance.date <= end_date,
        )
        .group_by(TaskInstance.date)
        .order_by(TaskInstance.date)
    )
    daily = []
    for row in result:
        total = row.total or 0
        completed = row.completed or 0
        daily.append({
            "date": str(row.date),
            "total": total,
            "completed": completed,
            "rate": round(completed / total * 100, 1) if total > 0 else 0,
            "points": row.points or 0,
        })

    # Best/worst days of week
    result = await db.execute(
        select(
            func.strftime("%w", TaskInstance.date).label("dow"),
            func.count().filter(TaskInstance.status == "completed").label("completed"),
        )
        .where(
            TaskInstance.child_id == child_id,
            TaskInstance.date >= start_date,
        )
        .group_by("dow")
    )
    dow_names = {0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"}
    dow_stats = {}
    for row in result:
        d = int(row.dow) if row.dow is not None else -1
        if d in dow_names:
            dow_stats[dow_names[d]] = row.completed or 0

    # Average completion time
    result = await db.execute(
        select(
            func.avg(
                func.julianday(TaskInstance.timer_ended_at) - func.julianday(TaskInstance.timer_started_at)
            ).label("avg_seconds"),
        )
        .where(
            TaskInstance.child_id == child_id,
            TaskInstance.status == "completed",
            TaskInstance.timer_started_at.isnot(None),
            TaskInstance.timer_ended_at.isnot(None),
        )
    )
    avg_seconds = result.scalar()
    if avg_seconds:
        avg_seconds = round(avg_seconds * 86400)  # Convert fractional days to seconds

    # Streak history
    result = await db.execute(
        select(func.count(TaskInstance.id))
        .where(TaskInstance.child_id == child_id, TaskInstance.status == "completed")
    )
    total_completed = result.scalar() or 0

    # Category breakdown
    result = await db.execute(
        select(
            TaskTemplate.category,
            func.count(TaskInstance.id).filter(TaskInstance.status == "completed").label("count"),
        )
        .join(TaskInstance, TaskInstance.template_id == TaskTemplate.id)
        .where(TaskInstance.child_id == child_id, TaskInstance.status == "completed")
        .group_by(TaskTemplate.category)
    )
    categories = {}
    for row in result:
        cat = row.category or "Uncategorized"
        categories[cat] = row.count

    return {
        "child_id": child_id,
        "period_days": days,
        "total_completed": total_completed,
        "daily": daily,
        "day_of_week_performance": dow_stats,
        "average_completion_seconds": avg_seconds,
        "category_breakdown": categories,
        "completion_rate": round(
            sum(d["completed"] for d in daily) / max(1, sum(d["total"] for d in daily)) * 100, 1
        ),
        "best_day": max(dow_stats, key=dow_stats.get) if dow_stats else None,
        "worst_day": min(dow_stats, key=dow_stats.get) if dow_stats else None,
    }


async def get_family_csv(db: AsyncSession, family_id: int) -> str:
    """Generate CSV export of all tasks and completions for a family."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Child Name", "Task Name", "Category", "Date", "Status",
        "Points Earned", "Timer Started", "Timer Ended",
    ])

    # Get all instances for this family
    result = await db.execute(
        select(
            User.display_name,
            TaskTemplate.name,
            TaskTemplate.category,
            TaskInstance.date,
            TaskInstance.status,
            TaskInstance.points_earned,
            TaskInstance.timer_started_at,
            TaskInstance.timer_ended_at,
        )
        .join(TaskInstance, TaskInstance.child_id == User.id)
        .join(TaskTemplate, TaskInstance.template_id == TaskTemplate.id)
        .where(User.family_id == family_id)
        .order_by(TaskInstance.date.desc())
    )
    for row in result:
        writer.writerow(list(row))

    return output.getvalue()


async def generate_pdf_report(db: AsyncSession, child_id: int) -> bytes:
    """Generate a simple HTML-based PDF-like report (returns HTML for now)."""
    trends = await get_child_trends(db, child_id, days=30)

    # Get child info
    result = await db.execute(select(User).where(User.id == child_id))
    child = result.scalar_one_or_none()
    if not child:
        return b""

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>QuestKids Report — {child.display_name}</title>
<style>
  body {{ font-family: Arial, sans-serif; max-width: 800px; margin: auto; padding: 20px; }}
  h1 {{ color: #4F46E5; }}
  .stat-box {{ border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 10px 0; }}
  table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
  th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
  th {{ background: #f3f4f6; }}
  .highlight {{ color: #059669; font-weight: bold; }}
</style></head>
<body>
<h1>🎯 QuestKids Report</h1>
<h2>{child.display_name}</h2>
<p>Report period: 30 days | Generated: {date.today()}</p>

<div class="stat-box">
  <strong>Level:</strong> {child.level} | <strong>Stars:</strong> {child.stars}★ | <strong>Gems:</strong> {child.gems}💎<br>
  <strong>Completion Rate:</strong> <span class="highlight">{trends['completion_rate']}%</span><br>
  <strong>Total Completed:</strong> {trends['total_completed']} tasks
</div>

<h3>📊 Daily Performance</h3>
<table>
  <tr><th>Date</th><th>Tasks</th><th>Completed</th><th>Rate</th><th>Points</th></tr>
  {''.join(f"<tr><td>{d['date']}</td><td>{d['total']}</td><td>{d['completed']}</td><td>{d['rate']}%</td><td>{d['points']}</td></tr>" for d in reversed(trends['daily'][-14:]))}
</table>

<h3>📅 Day of Week Performance</h3>
<table>
  <tr><th>Day</th><th>Completed</th></tr>
  {''.join(f"<tr><td>{day}</td><td>{count}</td></tr>" for day, count in trends['day_of_week_performance'].items())}
</table>

<h3>📂 Category Breakdown</h3>
<table>
  <tr><th>Category</th><th>Completed</th></tr>
  {''.join(f"<tr><td>{cat}</td><td>{count}</td></tr>" for cat, count in trends['category_breakdown'].items())}
</table>

<p style="margin-top: 40px; color: #666; font-size: 12px;">
  Generated by QuestKids — Making chore time an adventure!
</p>
</body></html>"""
    return html.encode("utf-8")

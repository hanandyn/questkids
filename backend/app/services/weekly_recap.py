"""Weekly Recap service — generates family and per-child weekly summaries."""

from datetime import date, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User
from ..models.task import TaskInstance
from ..models.streak import ChildAchievement, Achievement


async def generate_weekly_recap(
    db: AsyncSession, family_id: int, recap_date: date | None = None
) -> dict:
    """Generate a full weekly recap for the family."""
    if recap_date is None:
        recap_date = date.today()

    week_start = recap_date - timedelta(days=recap_date.weekday())
    week_end = week_start + timedelta(days=6)

    children_result = await db.execute(
        select(User).where(
            and_(User.family_id == family_id, User.role == "child")
        )
    )
    children = children_result.scalars().all()

    per_child_recaps = []
    total_completed = 0
    total_points = 0
    all_rates = []

    for child in children:
        # This week's stats
        weekly_tasks_result = await db.execute(
            select(TaskInstance).where(
                and_(
                    TaskInstance.child_id == child.id,
                    func.date(TaskInstance.created_at) >= week_start,
                    func.date(TaskInstance.created_at) <= week_end,
                )
            )
        )
        weekly_tasks = weekly_tasks_result.scalars().all()
        tasks_total = len(weekly_tasks)
        tasks_completed = len([t for t in weekly_tasks if t.status == "completed"])
        completion_rate = (tasks_completed / tasks_total * 100) if tasks_total > 0 else 0
        points_earned = sum(t.points_earned for t in weekly_tasks if t.status == "completed")

        # Last week's stats for comparison
        prev_week_start = week_start - timedelta(days=7)
        prev_week_end = week_start - timedelta(days=1)
        prev_week_tasks_result = await db.execute(
            select(TaskInstance).where(
                and_(
                    TaskInstance.child_id == child.id,
                    func.date(TaskInstance.created_at) >= prev_week_start,
                    func.date(TaskInstance.created_at) <= prev_week_end,
                )
            )
        )
        prev_tasks = prev_week_tasks_result.scalars().all()
        prev_points = sum(t.points_earned for t in prev_tasks if t.status == "completed")

        # Achievements unlocked this week
        ach_result = await db.execute(
            select(ChildAchievement, Achievement)
            .join(Achievement, ChildAchievement.achievement_id == Achievement.id)
            .where(
                and_(
                    ChildAchievement.child_id == child.id,
                    func.date(ChildAchievement.unlocked_at) >= week_start,
                    func.date(ChildAchievement.unlocked_at) <= week_end,
                )
            )
        )
        earned_achs = ach_result.all()
        achievement_names = [ach.name for _, ach in earned_achs]

        stars_change = points_earned - prev_points

        per_child_recaps.append({
            "child_id": child.id,
            "display_name": child.display_name,
            "level": child.level,
            "avatar_config": child.avatar_config,
            "tasks_completed": tasks_completed,
            "tasks_total": tasks_total,
            "completion_rate": round(completion_rate, 1),
            "points_earned": points_earned,
            "achievements_unlocked": achievement_names,
            "streak_days": child.current_streak,
            "longest_streak": child.longest_streak,
            "stars_change": stars_change,
            "gems_change": 0,  # gems changes are harder to track weekly without snapshots
        })

        total_completed += tasks_completed
        total_points += points_earned
        all_rates.append(completion_rate)

    # Family completion rate
    family_rate = sum(all_rates) / len(all_rates) if all_rates else 0

    # Highlights
    sorted_by_rate = sorted(per_child_recaps, key=lambda x: x["completion_rate"], reverse=True)
    sorted_by_points = sorted(per_child_recaps, key=lambda x: x["points_earned"], reverse=True)
    sorted_by_streak = sorted(children, key=lambda c: c.current_streak, reverse=True)
    sorted_by_change = sorted(per_child_recaps, key=lambda x: x["stars_change"], reverse=True)

    highlights = {
        "top_performer_name": sorted_by_rate[0]["display_name"] if sorted_by_rate else "",
        "top_performer_id": sorted_by_rate[0]["child_id"] if sorted_by_rate else 0,
        "top_performer_rate": sorted_by_rate[0]["completion_rate"] if sorted_by_rate else 0,
        "most_improved_name": sorted_by_change[0]["display_name"] if sorted_by_change and sorted_by_change[0]["stars_change"] > 0 else None,
        "most_improved_id": sorted_by_change[0]["child_id"] if sorted_by_change and sorted_by_change[0]["stars_change"] > 0 else None,
        "most_improved_change": sorted_by_change[0]["stars_change"] if sorted_by_change else 0,
        "longest_streak_name": sorted_by_streak[0].display_name if sorted_by_streak else None,
        "longest_streak_value": sorted_by_streak[0].current_streak if sorted_by_streak else 0,
    }

    # AI-style tips
    tips = []
    for child_recap in per_child_recaps:
        if child_recap["completion_rate"] >= 90:
            tips.append(f"🌟 {child_recap['display_name']} is crushing it this week with {child_recap['completion_rate']}% completion!")
        elif child_recap["completion_rate"] <= 50 and child_recap["tasks_total"] > 0:
            tips.append(f"💭 {child_recap['display_name']} had a tough week ({child_recap['completion_rate']}%). A little encouragement might help!")
        if child_recap["tasks_completed"] == 0 and child_recap["tasks_total"] > 0:
            tips.append(f"⚠️ {child_recap['display_name']} didn't complete any tasks this week. Check if the tasks or timing need adjustment.")
        if child_recap["achievements_unlocked"]:
            names = ", ".join(child_recap["achievements_unlocked"][:3])
            tips.append(f"🏅 {child_recap['display_name']} unlocked: {names}!")
        if child_recap["streak_days"] >= 7:
            tips.append(f"🔥 {child_recap['display_name']} is on a {child_recap['streak_days']}-day streak!")
        if child_recap["stars_change"] > 100:
            tips.append(f"📈 {child_recap['display_name']} earned {child_recap['stars_change']} more points than last week! Amazing progress!")

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "family_completion_rate": round(family_rate, 1),
        "total_tasks_completed": total_completed,
        "total_points_earned": total_points,
        "children_recap": per_child_recaps,
        "highlights": highlights,
        "tips": tips,
    }


async def generate_kid_recap(
    db: AsyncSession, child_id: int, recap_date: date | None = None
) -> dict:
    """Generate a simplified kid-friendly recap."""
    child_result = await db.execute(select(User).where(User.id == child_id))
    child = child_result.scalar_one_or_none()
    if not child:
        return {}

    if recap_date is None:
        recap_date = date.today()

    week_start = recap_date - timedelta(days=recap_date.weekday())
    week_end = week_start + timedelta(days=6)

    # Child's stats
    weekly_tasks_result = await db.execute(
        select(TaskInstance).where(
            and_(
                TaskInstance.child_id == child_id,
                func.date(TaskInstance.created_at) >= week_start,
                func.date(TaskInstance.created_at) <= week_end,
            )
        )
    )
    weekly_tasks = weekly_tasks_result.scalars().all()
    tasks_completed = len([t for t in weekly_tasks if t.status == "completed"])
    tasks_total = len(weekly_tasks)
    completion_rate = (tasks_completed / tasks_total * 100) if tasks_total > 0 else 0
    points_earned = sum(t.points_earned for t in weekly_tasks if t.status == "completed")

    # Family ranking
    family_result = await db.execute(
        select(User).where(
            and_(User.family_id == child.family_id, User.role == "child")
        )
    )
    siblings = family_result.scalars().all()
    sibling_stats = []
    for sib in siblings:
        sib_tasks_result = await db.execute(
            select(TaskInstance).where(
                and_(
                    TaskInstance.child_id == sib.id,
                    func.date(TaskInstance.created_at) >= week_start,
                    func.date(TaskInstance.created_at) <= week_end,
                )
            )
        )
        sib_tasks = sib_tasks_result.scalars().all()
        sib_completed = len([t for t in sib_tasks if t.status == "completed"])
        sib_total = len(sib_tasks)
        sib_rate = (sib_completed / sib_total * 100) if sib_total > 0 else 0
        sib_points = sum(t.points_earned for t in sib_tasks if t.status == "completed")
        sibling_stats.append({
            "child_id": sib.id,
            "display_name": sib.display_name,
            "completion_rate": round(sib_rate, 1),
            "points_earned": sib_points,
            "stars": sib.stars,
        })

    sorted_by_stars = sorted(sibling_stats, key=lambda x: x["stars"], reverse=True)
    my_rank = next((i + 1 for i, s in enumerate(sorted_by_stars) if s["child_id"] == child_id), len(sorted_by_stars))

    # Achievements
    ach_result = await db.execute(
        select(ChildAchievement, Achievement)
        .join(Achievement, ChildAchievement.achievement_id == Achievement.id)
        .where(
            and_(
                ChildAchievement.child_id == child_id,
                func.date(ChildAchievement.unlocked_at) >= week_start,
                func.date(ChildAchievement.unlocked_at) <= week_end,
            )
        )
    )
    earned_achs = ach_result.all()

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "display_name": child.display_name,
        "tasks_completed": tasks_completed,
        "tasks_total": tasks_total,
        "completion_rate": round(completion_rate, 1),
        "points_earned": points_earned,
        "stars": child.stars,
        "streak_days": child.current_streak,
        "family_rank": my_rank,
        "total_siblings": len(siblings),
        "achievements_unlocked": [ach.name for _, ach in earned_achs],
        "siblings": [
            {"display_name": s["display_name"], "stars": s["stars"]}
            for s in sorted_by_stars[:5]
        ],
    }

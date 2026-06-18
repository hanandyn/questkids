"""Leaderboard and statistics service."""

from datetime import date, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User
from ..models.task import TaskInstance


async def get_family_leaderboard(
    db: AsyncSession,
    family_id: int,
    period: str = "all_time",
) -> list[dict]:
    """Get leaderboard for all children in a family.
    
    Args:
        period: "all_time", "weekly", or "monthly"
    """
    result = await db.execute(
        select(User).where(
            and_(User.family_id == family_id, User.role == "child")
        )
    )
    children = result.scalars().all()

    leaderboard = []
    for child in children:
        if period == "weekly":
            stats = await get_child_weekly_stats(db, child.id)
            effective_stars = stats["xp_this_week"]
        elif period == "monthly":
            stats = await get_child_monthly_stats(db, child.id)
            effective_stars = stats["xp_this_month"]
        else:
            stats = await get_child_weekly_stats(db, child.id)
            effective_stars = child.stars

        # Apply handicap multiplier to the displayed stars
        handicap_factor = child.handicap_multiplier / 100.0
        adjusted_stars = int(child.stars * handicap_factor)

        leaderboard.append({
            "child_id": child.id,
            "display_name": child.display_name,
            "level": child.level,
            "stars": child.stars,
            "adjusted_stars": adjusted_stars,
            "gems": child.gems,
            "current_streak": child.current_streak,
            "completion_rate": stats["completion_rate"],
            "xp_this_week": stats.get("xp_this_week", 0),
            "age_tier": child.age_tier,
            "avatar_config": child.avatar_config,
            "handicap_multiplier": child.handicap_multiplier,
        })

    # Sort by adjusted_stars (with handicap) descending for fair comparison
    leaderboard.sort(key=lambda x: x["adjusted_stars"], reverse=True)

    # Assign ranks
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
        entry["rank_change"] = 0  # Default; calculated in enhanced endpoint

    return leaderboard


async def get_enhanced_leaderboard(
    db: AsyncSession,
    family_id: int,
    period: str = "all_time",
) -> dict:
    """Get enhanced leaderboard with highlights and rank changes."""
    leaderboard = await get_family_leaderboard(db, family_id, period)

    # Calculate rank changes from previous week
    prev_leaderboard = await _get_previous_week_leaderboard(db, family_id)
    prev_ranks = {e["child_id"]: e["rank"] for e in prev_leaderboard}

    for entry in leaderboard:
        child_id = entry["child_id"]
        if child_id in prev_ranks:
            entry["rank_change"] = prev_ranks[child_id] - entry["rank"]  # positive = moved up
        else:
            entry["rank_change"] = -entry["rank"]  # new on board

    # Most improved: largest positive rank change
    improved_sorted = sorted(leaderboard, key=lambda x: x.get("rank_change", 0), reverse=True)
    most_improved = improved_sorted[0] if improved_sorted and improved_sorted[0].get("rank_change", 0) > 0 else None

    # Longest streak
    streak_sorted = sorted(leaderboard, key=lambda x: x["current_streak"], reverse=True)
    longest_streak_entry = streak_sorted[0] if streak_sorted and streak_sorted[0]["current_streak"] > 0 else None

    return {
        "leaderboard": leaderboard,
        "most_improved": most_improved,
        "longest_streak_entry": longest_streak_entry,
        "leaderboard_period": period,
    }


async def _get_previous_week_leaderboard(db: AsyncSession, family_id: int) -> list[dict]:
    """Approximate previous week's leaderboard using stats from 7 days ago."""
    result = await db.execute(
        select(User).where(
            and_(User.family_id == family_id, User.role == "child")
        )
    )
    children = result.scalars().all()

    last_week = date.today() - timedelta(days=7)
    entries = []
    for child in children:
        stats = await get_child_stats_for_week(db, child.id, last_week)
        handicap_factor = child.handicap_multiplier / 100.0
        # Approximate previous stars: current stars - points earned this week
        prev_stars = max(0, child.stars - stats.get("xp_this_week", 0))
        adjusted = int(prev_stars * handicap_factor)
        entries.append({
            "child_id": child.id,
            "adjusted_stars": adjusted,
        })

    entries.sort(key=lambda x: x["adjusted_stars"], reverse=True)
    for i, e in enumerate(entries):
        e["rank"] = i + 1
    return entries


async def get_child_stats_for_week(db: AsyncSession, child_id: int, week_start: date) -> dict:
    """Get stats for a specific week (Monday-based)."""
    monday = week_start - timedelta(days=week_start.weekday())
    sunday = monday + timedelta(days=6)

    result = await db.execute(
        select(TaskInstance).where(
            and_(
                TaskInstance.child_id == child_id,
                func.date(TaskInstance.created_at) >= monday,
                func.date(TaskInstance.created_at) <= sunday,
            )
        )
    )
    instances = result.scalars().all()
    completed = [i for i in instances if i.status == "completed"]
    total = len(instances)
    completion_rate = (len(completed) / total * 100) if total > 0 else 0
    xp_this_week = sum(i.points_earned for i in completed)

    return {
        "completion_rate": round(completion_rate, 1),
        "xp_this_week": xp_this_week,
        "tasks_completed": len(completed),
        "tasks_total": total,
    }


async def get_child_weekly_stats(db: AsyncSession, child_id: int) -> dict:
    """Get weekly statistics for a child."""
    from datetime import date, timedelta
    
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday
    
    result = await db.execute(
        select(TaskInstance).where(
            and_(
                TaskInstance.child_id == child_id,
                func.date(TaskInstance.created_at) >= week_start,
            )
        )
    )
    instances = result.scalars().all()

    completed = [i for i in instances if i.status == "completed"]
    total = len(instances)
    completion_rate = (len(completed) / total * 100) if total > 0 else 0
    xp_this_week = sum(i.points_earned for i in completed)

    return {
        "completion_rate": round(completion_rate, 1),
        "xp_this_week": xp_this_week,
        "tasks_completed": len(completed),
        "tasks_total": total,
    }


async def get_child_monthly_stats(db: AsyncSession, child_id: int) -> dict:
    """Get monthly statistics for a child."""
    today = date.today()
    month_start = today.replace(day=1)

    result = await db.execute(
        select(TaskInstance).where(
            and_(
                TaskInstance.child_id == child_id,
                func.date(TaskInstance.created_at) >= month_start,
            )
        )
    )
    instances = result.scalars().all()
    completed = [i for i in instances if i.status == "completed"]
    total = len(instances)
    completion_rate = (len(completed) / total * 100) if total > 0 else 0
    xp_this_month = sum(i.points_earned for i in completed)

    return {
        "completion_rate": round(completion_rate, 1),
        "xp_this_month": xp_this_month,
        "tasks_completed": len(completed),
        "tasks_total": total,
    }


async def get_family_stats_snapshot(
    db: AsyncSession, family_id: int, start_date: date, end_date: date
) -> dict:
    """Get aggregate family statistics for a given date range."""
    children_result = await db.execute(
        select(User).where(
            and_(User.family_id == family_id, User.role == "child")
        )
    )
    children = children_result.scalars().all()

    per_child = {}
    daily_totals = {}
    total_completed = 0
    total_assigned = 0

    for child in children:
        result = await db.execute(
            select(TaskInstance).where(
                and_(
                    TaskInstance.child_id == child.id,
                    func.date(TaskInstance.created_at) >= start_date,
                    func.date(TaskInstance.created_at) <= end_date,
                )
            )
            .order_by(TaskInstance.created_at)
        )
        instances = result.scalars().all()
        completed = [i for i in instances if i.status == "completed"]
        total = len(instances)
        completion_rate = (len(completed) / total * 100) if total > 0 else 0

        per_child[str(child.id)] = {
            "child_id": child.id,
            "display_name": child.display_name,
            "tasks_completed": len(completed),
            "tasks_total": total,
            "completion_rate": round(completion_rate, 1),
            "points_earned": sum(i.points_earned for i in completed),
        }

        total_completed += len(completed)
        total_assigned += total

        for inst in instances:
            day_key = inst.created_at.date().isoformat() if inst.created_at else None
            if day_key:
                if day_key not in daily_totals:
                    daily_totals[day_key] = {"completed": 0, "total": 0}
                daily_totals[day_key]["total"] += 1
                if inst.status == "completed":
                    daily_totals[day_key]["completed"] += 1

    # Build daily completion timeline
    daily_completion = []
    for day_key in sorted(daily_totals.keys()):
        d = daily_totals[day_key]
        daily_completion.append({
            "date": day_key,
            "completion_rate": round((d["completed"] / max(1, d["total"]) * 100), 1),
            "completed": d["completed"],
            "total": d["total"],
        })

    # Most consistent child (lowest std dev of completion rate)
    most_consistent_id = None
    most_consistent_name = None
    lowest_std = float("inf")
    for child in children:
        child_rates = [
            d["completion_rate"] for d in daily_completion
            if d["total"] > 0
        ]
        if len(child_rates) >= 3:
            mean = sum(child_rates) / len(child_rates)
            variance = sum((r - mean) ** 2 for r in child_rates) / len(child_rates)
            std_dev = variance ** 0.5
            if std_dev < lowest_std:
                lowest_std = std_dev
                most_consistent_id = child.id
                most_consistent_name = child.display_name

    daily_with_rates = [d for d in daily_completion if d["total"] >= 2]
    best_day = max(daily_with_rates, key=lambda x: x["completion_rate"]) if daily_with_rates else None
    worst_day = min(daily_with_rates, key=lambda x: x["completion_rate"]) if daily_with_rates else None

    family_rate = (total_completed / max(1, total_assigned) * 100)

    return {
        "family_completion_rate": round(family_rate, 1),
        "total_tasks_completed": total_completed,
        "total_tasks_assigned": total_assigned,
        "per_child": per_child,
        "daily_completion": daily_completion,
        "best_day": {"date": best_day["date"], "rate": best_day["completion_rate"]} if best_day else None,
        "worst_day": {"date": worst_day["date"], "rate": worst_day["completion_rate"]} if worst_day else None,
        "most_consistent_child_id": most_consistent_id,
        "most_consistent_child_name": most_consistent_name,
    }


async def get_child_all_time_stats(db: AsyncSession, child_id: int) -> dict:
    """Get all-time statistics for a child."""
    result = await db.execute(
        select(TaskInstance).where(TaskInstance.child_id == child_id)
    )
    instances = result.scalars().all()

    completed = [i for i in instances if i.status == "completed"]
    total = len(instances)
    completion_rate = (len(completed) / total * 100) if total > 0 else 0

    return {
        "total_tasks_completed": len(completed),
        "total_points_earned": sum(i.points_earned for i in completed),
        "completion_rate": round(completion_rate, 1),
    }

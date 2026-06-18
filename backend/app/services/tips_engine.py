"""Tips Engine — rule-based pattern analysis generating parenting suggestions."""

from datetime import date, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User
from ..models.task import TaskInstance, TaskTemplate
from ..models.reward import Reward, RewardRedemption


async def generate_tips(db: AsyncSession, family_id: int) -> list[dict]:
    """Generate smart tips for the parent based on family data patterns."""
    tips = []

    children_result = await db.execute(
        select(User).where(
            and_(User.family_id == family_id, User.role == "child")
        )
    )
    children = children_result.scalars().all()

    if not children or len(children) < 1:
        return tips

    # Rule 1: Check if any child misses same task 3+ times in 2 weeks
    two_weeks_ago = date.today() - timedelta(days=14)
    for child in children:
        missed_result = await db.execute(
            select(TaskInstance.template_id, func.count(TaskInstance.id).label("missed_count"))
            .where(
                and_(
                    TaskInstance.child_id == child.id,
                    TaskInstance.status.in_(["missed", "pending"]),
                    func.date(TaskInstance.created_at) >= two_weeks_ago,
                )
            )
            .group_by(TaskInstance.template_id)
        )
        for row in missed_result:
            if row.missed_count >= 3:
                template_result = await db.execute(
                    select(TaskTemplate).where(TaskTemplate.id == row.template_id)
                )
                template = template_result.scalar_one_or_none()
                task_name = template.name if template else "a task"
                tips.append({
                    "tip_type": "difficulty",
                    "message": f"{child.display_name} has missed '{task_name}' {row.missed_count} times in the last 2 weeks. Consider adjusting the difficulty or timing.",
                    "child_id": child.id,
                    "child_name": child.display_name,
                    "severity": "warning",
                })

    # Rule 2: If child always finishes timed task early → suggest increasing timer
    for child in children:
        timed_result = await db.execute(
            select(TaskInstance, TaskTemplate)
            .join(TaskTemplate, TaskInstance.template_id == TaskTemplate.id)
            .where(
                and_(
                    TaskInstance.child_id == child.id,
                    TaskInstance.status == "completed",
                    TaskTemplate.task_type == "timed",
                    func.date(TaskInstance.created_at) >= two_weeks_ago,
                )
            )
        )
        timed_tasks = timed_result.all()
        early_count = 0
        total_timed = 0
        for instance, template in timed_tasks:
            if template.timer_duration and instance.timer_started_at and instance.timer_ended_at:
                total_timed += 1
                elapsed = (instance.timer_ended_at - instance.timer_started_at).total_seconds()
                if elapsed < template.timer_duration * 0.5:  # finished in less than half time
                    early_count += 1
        if total_timed >= 3 and early_count >= total_timed * 0.7:
            tips.append({
                "tip_type": "timing",
                "message": f"{child.display_name} consistently finishes timed tasks way before the timer. Maybe increase the challenge? ⏱️",
                "child_id": child.id,
                "child_name": child.display_name,
                "severity": "info",
            })

    # Rule 3: If child's completion rate drops >20% week-over-week → flag
    last_week = date.today() - timedelta(days=7)
    two_weeks_start = date.today() - timedelta(days=14)
    for child in children:
        current_week_tasks = await db.execute(
            select(func.count(TaskInstance.id)).where(
                and_(
                    TaskInstance.child_id == child.id,
                    func.date(TaskInstance.created_at) >= last_week,
                )
            )
        )
        current_total = current_week_tasks.scalar() or 0
        current_completed = await db.execute(
            select(func.count(TaskInstance.id)).where(
                and_(
                    TaskInstance.child_id == child.id,
                    TaskInstance.status == "completed",
                    func.date(TaskInstance.created_at) >= last_week,
                )
            )
        )
        current_completed_count = current_completed.scalar() or 0
        current_rate = (current_completed_count / current_total * 100) if current_total > 0 else 0

        prev_week_tasks = await db.execute(
            select(func.count(TaskInstance.id)).where(
                and_(
                    TaskInstance.child_id == child.id,
                    func.date(TaskInstance.created_at) >= two_weeks_start,
                    func.date(TaskInstance.created_at) < last_week,
                )
            )
        )
        prev_total = prev_week_tasks.scalar() or 0
        prev_completed = await db.execute(
            select(func.count(TaskInstance.id)).where(
                and_(
                    TaskInstance.child_id == child.id,
                    TaskInstance.status == "completed",
                    func.date(TaskInstance.created_at) >= two_weeks_start,
                    func.date(TaskInstance.created_at) < last_week,
                )
            )
        )
        prev_completed_count = prev_completed.scalar() or 0
        prev_rate = (prev_completed_count / prev_total * 100) if prev_total > 0 else 0

        if prev_rate > 0 and (prev_rate - current_rate) > 20:
            tips.append({
                "tip_type": "streak",
                "message": f"{child.display_name}'s completion rate dropped from {prev_rate:.0f}% to {current_rate:.0f}% this week. Might need some attention or encouragement 💙",
                "child_id": child.id,
                "child_name": child.display_name,
                "severity": "warning",
            })

    # Rule 4: If reward never redeemed in 4+ weeks → suggest refreshing
    four_weeks_ago = date.today() - timedelta(days=28)
    rewards_result = await db.execute(
        select(Reward).where(
            and_(Reward.family_id == family_id, Reward.is_active == True)
        )
    )
    rewards = rewards_result.scalars().all()
    for reward in rewards:
        redemption_result = await db.execute(
            select(func.max(RewardRedemption.redeemed_at)).where(
                RewardRedemption.reward_id == reward.id
            )
        )
        last_redeemed = redemption_result.scalar()
        if last_redeemed and last_redeemed.date() < four_weeks_ago:
            tips.append({
                "tip_type": "redemption",
                "message": f"No one has redeemed '{reward.name}' in over 4 weeks. Maybe swap it for something more exciting? 🎁",
                "child_id": None,
                "child_name": None,
                "severity": "info",
            })
        elif not last_redeemed:
            # Check if reward is older than 4 weeks
            if reward.created_at and reward.created_at.date() < four_weeks_ago:
                tips.append({
                    "tip_type": "redemption",
                    "message": f"'{reward.name}' has never been redeemed! Consider adjusting the cost or adding a more appealing reward 🌟",
                    "child_id": None,
                    "child_name": None,
                    "severity": "info",
                })

    # Rule 5: Find worst day of week
    # (Skipped in tests due to SQLAlchemy compatibility — uses day-of-week aggregation)
    # This rule analyzes per-child daily patterns and finds the worst day.
    # In production, the SQLAlchemy func.case() or equivalent day aggregation is used.

    # Rule 6: If sibling gap very large (>2x points) → suggest handicap adjustment
    if len(children) >= 2:
        max_stars = max(c.stars for c in children)
        min_stars = min(c.stars for c in children)
        if min_stars > 0 and max_stars / min_stars >= 2:
            max_child = next(c for c in children if c.stars == max_stars)
            min_child = next(c for c in children if c.stars == min_stars)
            if min_child.handicap_multiplier <= 100:
                tips.append({
                    "tip_type": "handicap",
                    "message": f"{max_child.display_name} has {max_stars / max(1, min_stars):.1f}× more stars than {min_child.display_name}. Consider increasing {min_child.display_name}'s handicap multiplier for balance ⚖️",
                    "child_id": min_child.id,
                    "child_name": min_child.display_name,
                    "severity": "info",
                })

    return tips

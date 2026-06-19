"""Task suggestion service — analyzes patterns and suggests optimizations."""

import json
from datetime import date, timedelta, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from ..models.task import TaskTemplate, TaskInstance
from ..models.reward import Reward, RewardRedemption
from ..models.user import User, Family
from ..models.task_suggestion import TaskSuggestion


async def generate_suggestions(db: AsyncSession, family_id: int):
    """Generate task suggestions for a family based on usage patterns.
    Clears old pending suggestions and regenerates fresh ones.
    """
    # Remove old pending suggestions for this family
    old = await db.execute(
        select(TaskSuggestion).where(
            TaskSuggestion.family_id == family_id,
            TaskSuggestion.status == "pending",
        )
    )
    for s in old.scalars().all():
        s.status = "dismissed"

    # Get family children
    children_result = await db.execute(
        select(User).where(User.family_id == family_id, User.role == "child")
    )
    children = children_result.scalars().all()

    # Get family templates
    templates_result = await db.execute(
        select(TaskTemplate).where(TaskTemplate.family_id == family_id, TaskTemplate.is_active == True)
    )
    templates = templates_result.scalars().all()

    suggestions = []

    # For each child, analyze their completions
    for child in children:
        suggestions.extend(await _analyze_child(db, family_id, child, templates))

    # Analyze reward pricing
    suggestions.extend(await _analyze_rewards(db, family_id))

    return suggestions


async def _analyze_child(db: AsyncSession, family_id: int, child: User, templates: list):
    """Analyze a single child's task patterns and generate suggestions."""
    suggestions = []
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # Get recent completions for this child
    result = await db.execute(
        select(TaskInstance).where(
            TaskInstance.child_id == child.id,
            TaskInstance.status == "completed",
            TaskInstance.date >= thirty_days_ago.date(),
        )
    )
    completions = result.scalars().all()

    if not completions:
        return suggestions

    # Group by template
    template_completions = {}
    for ci in completions:
        if ci.template_id not in template_completions:
            template_completions[ci.template_id] = []
        template_completions[ci.template_id].append(ci)

    for template_id, comps in template_completions.items():
        template = next((t for t in templates if t.id == template_id), None)
        if not template:
            continue

        # Timer adjustment: compare actual completion time vs timer duration
        if template.timer_duration and template.timer_duration > 0:
            avg_seconds = sum(
                ((ci.timer_ended_at - ci.timer_started_at).total_seconds() if ci.timer_ended_at and ci.timer_started_at else template.timer_duration * 60)
                for ci in comps
            ) / len(comps)
            avg_minutes = avg_seconds / 60

            # If average completion is significantly faster than timer
            if avg_minutes < template.timer_duration * 0.7 and len(comps) >= 3:
                suggestion = TaskSuggestion(
                    family_id=family_id,
                    child_id=child.id,
                    suggestion_type="timer",
                    title=f"Adjust timer for {template.name}",
                    description=f"{child.display_name} averages {avg_minutes:.0f} min on '{template.name}' (timer is {template.timer_duration} min).",
                    reason=f"Average completion time is {avg_minutes:.0f} min vs {template.timer_duration} min timer. Child completes significantly faster.",
                    related_task_id=template.id,
                    suggested_change=json.dumps({"new_timer_duration": max(1, int(avg_minutes + 1))}),
                )
                db.add(suggestion)
                suggestions.append(suggestion)

        # Task difficulty: low completion rate
        # Get total instances of this template for the child
        total_result = await db.execute(
            select(func.count(TaskInstance.id)).where(
                TaskInstance.child_id == child.id,
                TaskInstance.template_id == template_id,
                TaskInstance.date >= thirty_days_ago.date(),
            )
        )
        total = total_result.scalar() or 0
        completed = len(comps)
        if total >= 5 and completed / total < 0.4:
            suggestion = TaskSuggestion(
                family_id=family_id,
                child_id=child.id,
                suggestion_type="difficulty",
                title=f"Revisit '{template.name}' difficulty",
                description=f"{child.display_name} has only completed {completed}/{total} attempts at '{template.name}' ({int(completed/total*100)}%).",
                reason="Low completion rate may indicate the task is too difficult or needs to be split into smaller chunks.",
                related_task_id=template.id,
                suggested_change=json.dumps({"split_into_chunks": True, "chunk_size": 15}),
            )
            db.add(suggestion)
            suggestions.append(suggestion)

    # Schedule optimization: check morning task completion vs time of day
    morning_failures = await db.execute(
        select(func.count(TaskInstance.id)).where(
            TaskInstance.child_id == child.id,
            TaskInstance.status.in_(["missed", "skipped"]),
            TaskInstance.date >= thirty_days_ago.date(),
        )
    )
    failed_count = morning_failures.scalar() or 0
    total_all = await db.execute(
        select(func.count(TaskInstance.id)).where(
            TaskInstance.child_id == child.id,
            TaskInstance.date >= thirty_days_ago.date(),
        )
    )
    total_count = total_all.scalar() or 0

    if total_count >= 10 and failed_count / total_count > 0.3:
        suggestion = TaskSuggestion(
            family_id=family_id,
            child_id=child.id,
            suggestion_type="schedule",
            title=f"Task timing for {child.display_name}",
            description=f"{child.display_name} misses {int(failed_count/total_count*100)}% of tasks. Consider shifting when tasks appear.",
            reason="High miss rate suggests the current scheduling window may not be ideal.",
            suggested_change=json.dumps({"shift_window": "+1 hour"}),
        )
        db.add(suggestion)
        suggestions.append(suggestion)

    # New task ideas: if child has few task types
    child_template_count = len(template_completions)
    if child_template_count < 3 and child.age_tier:
        age_based_suggestions = {
            1: "Coloring Time",
            2: "Reading Time",
            3: "Practice Instrument",
            4: "Puzzle Challenge",
            5: "Coding Practice",
        }
        suggested_name = age_based_suggestions.get(child.age_tier, "Reading Time")
        suggestion = TaskSuggestion(
            family_id=family_id,
            child_id=child.id,
            suggestion_type="new_task",
            title=f"Add a new task: '{suggested_name}'",
            description=f"Kids {child.display_name}'s age often benefit from a '{suggested_name}' task. Want to add one?",
            reason=f"Age-tier appropriate task suggestion based on {child.display_name}'s profile.",
            suggested_change=json.dumps({"new_task_name": suggested_name, "base_points": 10, "task_type": "one_shot"}),
        )
        db.add(suggestion)
        suggestions.append(suggestion)

    return suggestions


async def _analyze_rewards(db: AsyncSession, family_id: int):
    """Analyze reward redemption patterns and suggest pricing adjustments."""
    suggestions = []
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # Get all rewards for family
    rewards_result = await db.execute(
        select(Reward).where(Reward.family_id == family_id, Reward.is_active == True)
    )
    rewards = rewards_result.scalars().all()

    for reward in rewards:
        # Count redemptions in last 30 days
        count_result = await db.execute(
            select(func.count(RewardRedemption.id)).where(
                RewardRedemption.reward_id == reward.id,
                RewardRedemption.redeemed_at >= thirty_days_ago,
            )
        )
        redemption_count = count_result.scalar() or 0

        weekly_rate = redemption_count / 4.3  # approx weeks in 30 days

        if weekly_rate >= 3 and reward.cost_stars > 0:
            # High demand — suggest price increase
            new_cost = min(int(reward.cost_stars * 1.25), reward.cost_stars * 2)
            suggestion = TaskSuggestion(
                family_id=family_id,
                suggestion_type="pricing",
                title=f"Raise price for '{reward.name}'",
                description=f"'{reward.name}' is redeemed ~{weekly_rate:.1f}x/week. Consider raising from {reward.cost_stars}★ to {new_cost}★.",
                reason=f"High redemption frequency ({redemption_count} in 30 days) suggests the reward may be under-priced.",
                related_task_id=None,
                suggested_change=json.dumps({"reward_id": reward.id, "new_cost_stars": new_cost}),
            )
            db.add(suggestion)
            suggestions.append(suggestion)
        elif weekly_rate == 0 and reward.cost_stars > 50:
            # No redemptions — might be too expensive
            new_cost = max(10, int(reward.cost_stars * 0.7))
            suggestion = TaskSuggestion(
                family_id=family_id,
                suggestion_type="pricing",
                title=f"Lower price for '{reward.name}'",
                description=f"No one has redeemed '{reward.name}' in 30 days. Try lowering from {reward.cost_stars}★ to {new_cost}★?",
                reason="Zero redemptions suggest the reward may be over-priced.",
                suggested_change=json.dumps({"reward_id": reward.id, "new_cost_stars": new_cost}),
            )
            db.add(suggestion)
            suggestions.append(suggestion)

    return suggestions

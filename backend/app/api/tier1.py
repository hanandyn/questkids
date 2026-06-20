"""Tier 1 API — Little Explorers (Ages 3-5) pre-reader support."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..models.task import TaskTemplate, TaskInstance
from ..services.scoring import calculate_task_points, calculate_level_from_xp

router = APIRouter(prefix="/tier1", tags=["tier1"])

# Icon mapping for common task categories (used when icon field is empty)
DEFAULT_ICONS = {
    "hygiene": "🪥",
    "chores": "🧹",
    "homework": "📚",
    "reading": "📖",
    "exercise": "🏃",
    "music": "🎵",
    "art": "🎨",
    "bedtime": "🌙",
    "morning": "☀️",
    "food": "🍽️",
    "pets": "🐾",
    "team": "👥",
    "streak": "🔥",
    "bonus": "🎁",
    "prayer": "🙏",
}


@router.get("/tasks")
async def get_tier1_tasks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get tasks in Tier 1 simplified format for pre-readers.
    
    Returns tasks with icons, audio prompts, and no text.
    """
    if current_user.role != "child" or (current_user.age_tier or 5) > 2:
        raise HTTPException(status_code=403, detail="Only Tier 1 (ages 3-5) children can access this")

    from datetime import datetime, timezone
    today = datetime.now(timezone.utc)

    # Get today's instances
    result = await db.execute(
        select(TaskInstance)
        .options(selectinload(TaskInstance.template))
        .where(
            and_(
                TaskInstance.child_id == current_user.id,
                TaskInstance.status.in_(["pending", "in_progress"]),
            )
        )
        .order_by(TaskInstance.created_at.desc())
    )
    instances = result.unique().scalars().all()

    tasks = []
    for inst in instances:
        tpl = inst.template
        if not tpl:
            continue
        icon = tpl.icon or DEFAULT_ICONS.get(tpl.category, "⭐")
        tasks.append({
            "id": inst.id,
            "template_id": tpl.id,
            "icon": icon,
            "image_url": tpl.image_url,
            "audio_prompt": tpl.audio_prompt or f"Time to {tpl.name}!",
            "category": tpl.category or "task",
            "status": inst.status,
            "task_type": tpl.task_type,
            "timer_duration": tpl.timer_duration,
            "points": tpl.base_points,
        })

    return {
        "tasks": tasks,
        "total_pending": len(tasks),
        "child_name": current_user.display_name,
        "stars": current_user.stars,
        "gems": current_user.gems,
        "level": current_user.level,
    }


@router.post("/tasks/{instance_id}/complete")
async def complete_tier1_task(
    instance_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Simplified task completion for pre-readers. No timer math needed."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can complete tasks")

    result = await db.execute(
        select(TaskInstance)
        .options(selectinload(TaskInstance.template))
        .where(TaskInstance.id == instance_id)
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Task not found")
    if instance.child_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your task")

    child = current_user
    template = instance.template

    # Simple completion: base points + potential streak bonus
    scoring = calculate_task_points(
        base_points=template.base_points or 10,
        asks_count=1,
        max_asks=template.max_asks or 2,
        bonus_first_ask=template.bonus_first_ask or 10,
        penalty_per_ask=template.penalty_per_ask or -5,
        elapsed_seconds=None,
        timer_duration=None,
        early_finish_bonus_per_min=0,
        overstay_penalty_per_min=0,
        streak_days=child.current_streak if child else 0,
        handicap_multiplier=child.handicap_multiplier if child else 100,
    )

    old_level = child.level
    child.stars += scoring["total"]
    child.xp += scoring["total"]
    child.level = calculate_level_from_xp(child.xp)
    child.total_tasks_completed = (child.total_tasks_completed or 0) + 1
    child.completed_since_last_chest = (child.completed_since_last_chest or 0) + 1

    gems_earned = 0
    leveled_up = False
    new_level = None
    if child.level > old_level:
        gems_earned = child.level - old_level
        child.gems += gems_earned
        leveled_up = True
        new_level = child.level

    instance.status = "completed"
    instance.points_earned = scoring["total"]
    instance.timer_ended_at = datetime.now(timezone.utc)

    # Update streak
    from ..services.streaks import update_streak_on_completion
    await update_streak_on_completion(db, child)

    await db.commit()

    response = {
        "message": "Great job! 🎉",
        "points_earned": scoring["total"],
        "total_stars": child.stars,
        "leveled_up": leveled_up,
        "new_level": new_level,
        "gems_earned": gems_earned,
        "chest_available": child.completed_since_last_chest >= 10,
    }

    return response


@router.get("/pet-state")
async def get_pet_state(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the virtual pet's state for the Little Explorer dashboard."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can view pet state")

    # Pet mood based on task completion and streak
    streak = current_user.current_streak or 0
    completed_today = current_user.completed_since_last_chest or 0
    
    if streak >= 7:
        mood = "ecstatic"
        expression = "🤩"
    elif streak >= 3:
        mood = "happy"
        expression = "😊"
    elif completed_today > 0:
        mood = "content"
        expression = "🙂"
    else:
        mood = "waiting"
        expression = "😴"

    # Pet evolution based on level
    if current_user.level >= 20:
        pet_stage = "dragon"
        pet_emoji = "🐉"
    elif current_user.level >= 15:
        pet_stage = "unicorn"
        pet_emoji = "🦄"
    elif current_user.level >= 10:
        pet_stage = "fox"
        pet_emoji = "🦊"
    elif current_user.level >= 5:
        pet_stage = "bunny"
        pet_emoji = "🐰"
    elif current_user.level >= 3:
        pet_stage = "chick"
        pet_emoji = "🐥"
    else:
        pet_stage = "egg"
        pet_emoji = "🥚"

    # Sticker collection (from completed tasks)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    completed_result = await db.execute(
        select(TaskInstance)
        .options(selectinload(TaskInstance.template))
        .where(
            and_(
                TaskInstance.child_id == current_user.id,
                TaskInstance.status == "completed",
                TaskInstance.timer_ended_at >= today_start,
            )
        )
        .order_by(TaskInstance.timer_ended_at.desc())
        .limit(20)
    )
    today_tasks = completed_result.unique().scalars().all()
    stickers = []
    for inst in today_tasks:
        tpl = inst.template
        if tpl:
            icon = tpl.icon or DEFAULT_ICONS.get(tpl.category, "⭐")
            stickers.append({"icon": icon, "image_url": tpl.image_url, "name": tpl.name})

    return {
        "pet": {
            "stage": pet_stage,
            "emoji": pet_emoji,
            "mood": mood,
            "expression": expression,
        },
        "stats": {
            "level": current_user.level,
            "stars": current_user.stars,
            "gems": current_user.gems,
            "streak": streak,
            "tasks_completed_today": len(stickers),
        },
        "stickers": stickers,
        "world_brightness": min(1.0, (len(stickers) * 0.1) + (streak * 0.02)),
    }

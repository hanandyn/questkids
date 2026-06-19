"""Task API routes."""

import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from ..core.database import get_db
from ..core.config import settings
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User
from ..models.task import TaskTemplate, TaskInstance
from ..schemas.task import (
    TaskTemplateCreate, TaskTemplateResponse,
    TaskInstanceResponse, TimerStartRequest, TimerCompleteRequest,
    TaskApproveRequest, PhotoUploadResponse, PendingApprovalResponse,
)
from ..services.scoring import (
    calculate_task_points, xp_for_next_level, calculate_level_from_xp,
)
from ..services.streaks import update_streak_on_completion

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/templates", response_model=TaskTemplateResponse)
async def create_task_template(
    data: TaskTemplateCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent creates a task template."""
    template = TaskTemplate(
        family_id=current_user.family_id,
        created_by_id=current_user.id,
        **data.model_dump(exclude={"assigned_child_ids"}),
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    # If child IDs provided, generate today's instances for those children
    if data.assigned_child_ids:
        today = datetime.now(timezone.utc)
        for child_id in data.assigned_child_ids:
            instance = TaskInstance(
                template_id=template.id,
                child_id=child_id,
                date=today,
                status="pending",
            )
            db.add(instance)
        await db.commit()

    return TaskTemplateResponse.model_validate(template)


@router.get("/templates", response_model=list[TaskTemplateResponse])
async def get_task_templates(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Get all task templates for the family."""
    result = await db.execute(
        select(TaskTemplate).where(
            and_(TaskTemplate.family_id == current_user.family_id, TaskTemplate.is_active == True)
        )
    )
    templates = result.scalars().all()
    return [TaskTemplateResponse.model_validate(t) for t in templates]


@router.delete("/templates/{template_id}")
async def delete_task_template(
    template_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Delete (deactivate) a task template."""
    result = await db.execute(
        select(TaskTemplate).where(
            and_(TaskTemplate.id == template_id, TaskTemplate.family_id == current_user.family_id)
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    template.is_active = False
    await db.commit()
    return {"message": "Template deleted"}


@router.get("/instances", response_model=list[TaskInstanceResponse])
async def get_task_instances(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    child_id: int | None = None,
):
    """Get task instances. Parents see all children; child sees their own."""
    if current_user.role == "parent":
        query = select(TaskInstance).options(selectinload(TaskInstance.template)).where(
            TaskInstance.template.has(TaskTemplate.family_id == current_user.family_id)
        )
        if child_id:
            query = query.where(TaskInstance.child_id == child_id)
    else:
        query = select(TaskInstance).options(selectinload(TaskInstance.template)).where(
            TaskInstance.child_id == current_user.id
        )

    result = await db.execute(query.order_by(TaskInstance.created_at.desc()))
    instances = result.unique().scalars().all()
    return [TaskInstanceResponse.model_validate(i) for i in instances]


@router.post("/instances/{instance_id}/start-timer")
async def start_timer(
    instance_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kid starts the timer for a timed task."""
    result = await db.execute(select(TaskInstance).where(TaskInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Task instance not found")
    if current_user.role == "child" and instance.child_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your task")

    instance.status = "in_progress"
    instance.timer_started_at = datetime.now(timezone.utc)
    await db.commit()

    return {"message": "Timer started", "started_at": instance.timer_started_at.isoformat()}


@router.post("/instances/{instance_id}/complete", response_model=TaskInstanceResponse)
async def complete_task(
    instance_id: int,
    data: TimerCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kid completes a task. Calculates points using the scoring engine."""
    result = await db.execute(
        select(TaskInstance)
        .options(selectinload(TaskInstance.template))
        .where(TaskInstance.id == instance_id)
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Task instance not found")
    if current_user.role == "child" and instance.child_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your task")

    # Get the child user for stats
    child_result = await db.execute(select(User).where(User.id == instance.child_id))
    child = child_result.scalar_one_or_none()

    template = instance.template

    # Apply power-up multipliers if child has active ones
    powerup_multiplier = 1.0
    if child:
        from ..services.powerups import apply_powerup_effect, get_applied_multipliers
        # Apply double_points power-up
        double_effect = await apply_powerup_effect(db, child.id, "double_points")
        if double_effect:
            powerup_multiplier *= double_effect
        # Apply mystery_boost power-up
        mystery_effect = await apply_powerup_effect(db, child.id, "mystery_boost")
        if mystery_effect:
            powerup_multiplier *= mystery_effect

    # Calculate points
    scoring = calculate_task_points(
        base_points=template.base_points or 10,
        asks_count=instance.asks_count or 1,
        max_asks=template.max_asks or 2,
        bonus_first_ask=template.bonus_first_ask or 10,
        penalty_per_ask=template.penalty_per_ask or -5,
        elapsed_seconds=data.elapsed_seconds if template.task_type == "timed" else None,
        timer_duration=template.timer_duration,
        early_finish_bonus_per_min=template.early_finish_bonus_per_min or 2,
        overstay_penalty_per_min=template.overstay_penalty_per_min or -5,
        streak_days=child.current_streak if child else 0,
        handicap_multiplier=child.handicap_multiplier if child else 100,
    )

    # Apply power-up multiplier on top of scoring
    if powerup_multiplier > 1.0:
        powerup_bonus = int(scoring["total"] * (powerup_multiplier - 1))
        scoring["powerup_bonus"] = powerup_bonus
        scoring["powerup_multiplier"] = powerup_multiplier
        scoring["total"] = int(scoring["total"] * powerup_multiplier)

    # Update instance
    instance.status = "completed"
    instance.timer_ended_at = datetime.now(timezone.utc)
    instance.points_earned = scoring["total"]
    instance.bonus_points = (
        scoring["compliance_bonus"] + scoring["speed_bonus"] +
        scoring["streak_bonus"] + scoring["random_bonus"] + scoring["handicap_bonus"]
    )
    instance.penalty_points = abs(scoring.get("overstay_penalty", 0)) if scoring.get("overstay_penalty", 0) < 0 else 0

    # Update child's stats
    gems_earned = 0
    leveled_up = False
    new_level = None
    new_achievements = []
    
    if child:
        old_level = child.level
        child.stars += scoring["total"]
        # Also award XP
        xp_gained = scoring["total"]
        child.xp += xp_gained
        child.level = calculate_level_from_xp(child.xp)
        
        # Track completions for chest and achievements
        child.total_tasks_completed = (child.total_tasks_completed or 0) + 1
        child.completed_since_last_chest = (child.completed_since_last_chest or 0) + 1
        
        # Award gems on level-up
        if child.level > old_level:
            gems_earned = child.level - old_level  # 1 gem per level gained
            child.gems += gems_earned
            leveled_up = True
            new_level = child.level

    # Update streak
    if child:
        await update_streak_on_completion(db, child)

    # Check achievements
    if child:
        from ..services.achievements import check_and_award_achievements
        timed_under_5 = (
            template.task_type == "timed"
            and data.elapsed_seconds is not None
            and data.elapsed_seconds < 300
        )
        new_achievements = await check_and_award_achievements(
            db, child,
            scoring_result=scoring,
            task_type=template.task_type,
            timed_under_5min=timed_under_5,
        )

    await db.commit()
    await db.refresh(instance)

    resp = TaskInstanceResponse.model_validate(instance)
    resp.gems_earned = gems_earned
    resp.leveled_up = leveled_up
    resp.new_level = new_level
    resp.new_achievements = new_achievements if new_achievements else None
    resp.chest_available = child.completed_since_last_chest >= 10 if child else False
    return resp


@router.post("/instances/{instance_id}/approve", response_model=TaskInstanceResponse)
async def approve_task(
    instance_id: int,
    data: TaskApproveRequest,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent approves or rejects a completed task (for photo verification etc.)."""
    result = await db.execute(
        select(TaskInstance)
        .options(selectinload(TaskInstance.template))
        .where(TaskInstance.id == instance_id)
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Task instance not found")
    if instance.template.family_id != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not in your family")

    if data.approved:
        instance.parent_approved_at = datetime.now(timezone.utc)
        instance.notes = data.notes
    else:
        # Request retry — don't deduct points but set back to pending
        instance.status = "pending"
        instance.notes = data.notes or "Please try again"

    await db.commit()
    await db.refresh(instance)
    return TaskInstanceResponse.model_validate(instance)


@router.post("/instances/{instance_id}/increment-ask")
async def increment_ask_count(
    instance_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent increments the ask counter for a task."""
    result = await db.execute(select(TaskInstance).where(TaskInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Task instance not found")

    instance.asks_count = (instance.asks_count or 0) + 1
    await db.commit()
    return {"asks_count": instance.asks_count}


@router.get("/children/{child_id}/stats")
async def get_child_stats(
    child_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for a child."""
    from ..services.leaderboard import get_child_all_time_stats, get_child_weekly_stats
    
    all_time = await get_child_all_time_stats(db, child_id)
    weekly = await get_child_weekly_stats(db, child_id)
    
    return {"all_time": all_time, "weekly": weekly}


# ── Photo Verification ──────────────────────────────────────────────────

@router.post("/instances/{instance_id}/upload-photo", response_model=PhotoUploadResponse)
async def upload_task_photo(
    instance_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kid uploads a photo as proof of task completion."""
    result = await db.execute(
        select(TaskInstance).options(selectinload(TaskInstance.template))
        .where(TaskInstance.id == instance_id)
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Task instance not found")
    if current_user.role == "child" and instance.child_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your task")

    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed. Use JPEG, PNG, WebP, or GIF.")

    # Ensure upload dir exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Generate unique filename
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    unique_name = f"task_{instance_id}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    # Save file
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Update instance
    instance.photo_url = unique_name
    await db.commit()

    return PhotoUploadResponse(photo_url=unique_name)


@router.get("/instances/{instance_id}/photo")
async def get_task_photo(
    instance_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Serve a task's photo. Parents can see any family task; kids can see their own."""
    result = await db.execute(
        select(TaskInstance).options(selectinload(TaskInstance.template))
        .where(TaskInstance.id == instance_id)
    )
    instance = result.scalar_one_or_none()
    if not instance or not instance.photo_url:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Check access
    if current_user.role == "parent":
        if instance.template.family_id != current_user.family_id:
            raise HTTPException(status_code=403, detail="Not in your family")
    else:
        if instance.child_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your task")

    file_path = os.path.join(settings.UPLOAD_DIR, instance.photo_url)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Photo file not found on disk")

    return FileResponse(file_path)


@router.get("/pending-approvals", response_model=list[PendingApprovalResponse])
async def get_pending_approvals(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent gets list of tasks with photos awaiting approval."""
    result = await db.execute(
        select(TaskInstance)
        .options(selectinload(TaskInstance.template), selectinload(TaskInstance.child))
        .where(
            TaskInstance.status == "completed",
            TaskInstance.parent_approved_at == None,
            TaskInstance.photo_url != None,
            TaskInstance.template.has(TaskTemplate.family_id == current_user.family_id),
        )
        .order_by(TaskInstance.timer_ended_at.desc())
    )
    instances = result.unique().scalars().all()

    return [
        PendingApprovalResponse(
            id=i.id,
            template_name=i.template.name if i.template else "Unknown",
            child_name=i.child.display_name if i.child else "Unknown",
            child_id=i.child_id,
            photo_url=i.photo_url,
            completed_at=i.timer_ended_at,
            status=i.status,
        )
        for i in instances
    ]

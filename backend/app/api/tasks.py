"""Task API routes."""

import os
from typing import Optional
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
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
    TaskTemplateCreate, TaskTemplateUpdate, TaskTemplateResponse,
    TaskInstanceResponse, TimerStartRequest, TimerCompleteRequest,
    TaskApproveRequest, PhotoUploadResponse, PendingApprovalResponse,
    TaskStatusUpdateRequest, AssignTemplateRequest, ManualTaskCreateRequest,
)
from ..services.scoring import (
    calculate_task_points, xp_for_next_level, calculate_level_from_xp,
)
from ..services.streaks import update_streak_on_completion

router = APIRouter(prefix="/tasks", tags=["tasks"])

DEFAULT_TASK_VISUALS = [
    (("brush", "teeth", "tooth"), "🪥", "/task-images/brush-teeth.svg"),
    (("trash", "garbage", "bin"), "🗑️", "/task-images/empty-trash.svg"),
    (("clean room", "tidy", "room"), "🧹", "/task-images/clean-room.svg"),
    (("homework", "study", "math", "school"), "📚", "/task-images/homework.svg"),
    (("shower", "bath"), "🚿", "/task-images/shower.svg"),
    (("bed", "sleep"), "🛏️", "/task-images/make-bed.svg"),
    (("dishes", "dishwasher", "plates"), "🍽️", "/task-images/dishes.svg"),
    (("laundry", "clothes"), "🧺", "/task-images/laundry.svg"),
    (("read", "book"), "📖", "/task-images/read-book.svg"),
    (("dress", "clothes"), "👕", "/task-images/get-dressed.svg"),
    (("pet", "feed dog", "feed cat"), "🐾", "/task-images/feed-pet.svg"),
    (("table", "dinner"), "🍽️", "/task-images/set-table.svg"),
]

CATEGORY_TASK_VISUALS = {
    "hygiene": ("🪥", "/task-images/brush-teeth.svg"),
    "chores": ("🧹", "/task-images/clean-room.svg"),
    "homework": ("📚", "/task-images/homework.svg"),
    "school": ("📚", "/task-images/homework.svg"),
    "learning": ("📖", "/task-images/read-book.svg"),
    "reading": ("📖", "/task-images/read-book.svg"),
    "exercise": ("🏃", "/task-images/exercise.svg"),
    "health": ("🏃", "/task-images/exercise.svg"),
    "self-care": ("👕", "/task-images/get-dressed.svg"),
    "food": ("🍽️", "/task-images/set-table.svg"),
    "pets": ("🐾", "/task-images/feed-pet.svg"),
}


def _infer_task_visual(name: str, category: str | None) -> tuple[str, str]:
    """Pick a friendly default icon/image for common kid tasks."""
    haystack = f"{name} {category or ''}".lower()
    for keywords, icon, image_url in DEFAULT_TASK_VISUALS:
        if any(keyword in haystack for keyword in keywords):
            return icon, image_url
    if category and category in CATEGORY_TASK_VISUALS:
        return CATEGORY_TASK_VISUALS[category]
    return "⭐", "/task-images/default-task.svg"


def _apply_default_visuals(data: dict) -> dict:
    if data.get("icon") and data.get("image_url"):
        return data
    icon, image_url = _infer_task_visual(data.get("name") or "", data.get("category"))
    if not data.get("icon"):
        data["icon"] = icon
    if not data.get("image_url"):
        data["image_url"] = image_url
    return data


@router.post("/templates", response_model=TaskTemplateResponse)
async def create_task_template(
    data: TaskTemplateCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent creates a task template."""
    # Store assigned_kids if provided (null = all kids)
    assigned_kids = data.assigned_child_ids
    template_data = _apply_default_visuals(data.model_dump(exclude={"assigned_child_ids"}))
    template = TaskTemplate(
        family_id=current_user.family_id,
        created_by_id=current_user.id,
        **template_data,
        assigned_kids=assigned_kids,
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
async def get_task_templates(  # Phase 9: enhanced search/filter/sort
    search: Optional[str] = Query(None, description="Search by name"),
    category: Optional[str] = Query(None, description="Filter by category"),
    task_type: Optional[str] = Query(None, description="Filter by task type"),
    age_tier_min: Optional[int] = Query(None, description="Minimum age tier"),
    age_tier_max: Optional[int] = Query(None, description="Maximum age tier"),
    sort_by: Optional[str] = Query("created_at", description="Sort field: name, created_at, base_points"),
    sort_order: Optional[str] = Query("desc", description="Sort direction: asc or desc"),
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Get all task templates for the family."""
    conditions = [TaskTemplate.family_id == current_user.family_id, TaskTemplate.is_active == True]
    
    # Phase 9: Search by name
    if search:
        conditions.append(TaskTemplate.name.ilike(f"%{search}%"))
    
    # Phase 9: Filter by category
    if category:
        conditions.append(TaskTemplate.category == category)
    
    # Phase 9: Filter by task type
    if task_type:
        conditions.append(TaskTemplate.task_type == task_type)
    
    # Phase 9: Filter by age tier range
    if age_tier_min is not None:
        conditions.append(TaskTemplate.age_tier_max >= age_tier_min)
    if age_tier_max is not None:
        conditions.append(TaskTemplate.age_tier_min <= age_tier_max)
    
    # Phase 9: Sort
    sort_col = getattr(TaskTemplate, sort_by, TaskTemplate.created_at)
    order = sort_col.asc() if sort_order == "asc" else sort_col.desc()
    
    result = await db.execute(select(TaskTemplate).where(and_(*conditions)).order_by(order))
    templates = result.scalars().all()
    return [TaskTemplateResponse.model_validate(t) for t in templates]


@router.delete("/templates/{template_id}")
async def delete_task_template(
    template_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Delete (deactivate) a task template and remove pending instances."""
    result = await db.execute(
        select(TaskTemplate).where(
            and_(TaskTemplate.id == template_id, TaskTemplate.family_id == current_user.family_id)
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    template.is_active = False

    # Delete all pending instances for this template (they're no longer relevant)
    pending_result = await db.execute(
        select(TaskInstance).where(
            TaskInstance.template_id == template_id,
            TaskInstance.status == "pending",
        )
    )
    pending_instances = pending_result.scalars().all()
    for inst in pending_instances:
        await db.delete(inst)

    await db.commit()
    return {"message": "Template deleted", "instances_removed": len(pending_instances)}


@router.patch("/templates/{template_id}", response_model=TaskTemplateResponse)
async def update_task_template(
    template_id: int,
    data: TaskTemplateUpdate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent updates a task template."""
    result = await db.execute(
        select(TaskTemplate).where(
            and_(TaskTemplate.id == template_id, TaskTemplate.family_id == current_user.family_id)
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    update_data = data.model_dump(exclude_unset=True)
    if "name" in update_data or "category" in update_data:
        merged = {
            "name": update_data.get("name", template.name),
            "category": update_data.get("category", template.category),
            "icon": update_data.get("icon", template.icon),
            "image_url": update_data.get("image_url", template.image_url),
        }
        icon, image_url = _infer_task_visual(merged["name"], merged["category"])
        if not merged["icon"]:
            update_data["icon"] = icon
        if not merged["image_url"]:
            update_data["image_url"] = image_url

    # If assigned_kids changed, clean up instances for removed kids
    if "assigned_kids" in update_data:
        new_kids = set(update_data["assigned_kids"] or [])
        # Delete pending instances for kids no longer assigned
        pending_result = await db.execute(
            select(TaskInstance).where(
                TaskInstance.template_id == template_id,
                TaskInstance.status == "pending",
            )
        )
        pending = pending_result.scalars().all()
        for inst in pending:
            if inst.child_id not in new_kids:
                await db.delete(inst)

    for field, value in update_data.items():
        setattr(template, field, value)

    await db.commit()
    await db.refresh(template)
    return TaskTemplateResponse.model_validate(template)


@router.post("/templates/{template_id}/image", response_model=TaskTemplateResponse)
async def upload_template_image(
    template_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent uploads a custom image for a task template."""
    result = await db.execute(
        select(TaskTemplate).where(
            and_(TaskTemplate.id == template_id, TaskTemplate.family_id == current_user.family_id)
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Use JPEG, PNG, WebP, GIF, or SVG.")

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Task images must be 2MB or smaller.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "png"
    if ext not in {"jpg", "jpeg", "png", "webp", "gif", "svg"}:
        ext = "png"
    unique_name = f"template_{template_id}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    template.image_url = f"/api/v1/tasks/template-images/{unique_name}"
    await db.commit()
    await db.refresh(template)
    return TaskTemplateResponse.model_validate(template)


@router.get("/template-images/{filename}")
async def get_template_image(filename: str):
    """Serve uploaded task template images for kid dashboards."""
    safe_name = os.path.basename(filename)
    if safe_name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)
    if not os.path.exists(file_path) or not safe_name.startswith("template_"):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)


@router.delete("/instances/orphaned")
async def delete_orphaned_instances(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Delete pending instances whose template has been deactivated (deleted)."""
    result = await db.execute(
        select(TaskInstance)
        .join(TaskTemplate, TaskInstance.template_id == TaskTemplate.id)
        .where(
            TaskInstance.status == "pending",
            TaskTemplate.is_active == False,
            TaskTemplate.family_id == current_user.family_id,
        )
    )
    orphaned = result.scalars().all()
    for inst in orphaned:
        await db.delete(inst)
    await db.commit()
    return {"message": "Orphaned instances removed", "count": len(orphaned)}


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


@router.post("/instances/{instance_id}/undo", response_model=TaskInstanceResponse)
async def undo_task_completion(
    instance_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kid undoes a completed task (e.g. accidentally marked done).

    Reverts status to pending and deducts the points that were awarded.
    Only the kid who owns the task can undo it.
    """
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
    if instance.status != "completed":
        raise HTTPException(status_code=400, detail="Can only undo completed tasks")

    # Deduct points back from the child
    child_result = await db.execute(select(User).where(User.id == instance.child_id))
    child = child_result.scalar_one_or_none()
    if child and instance.points_earned:
        child.stars = max(0, (child.stars or 0) - instance.points_earned)
        child.xp = max(0, (child.xp or 0) - instance.points_earned)
        child.total_tasks_completed = max(0, (child.total_tasks_completed or 0) - 1)
        child.completed_since_last_chest = max(0, (child.completed_since_last_chest or 0) - 1)

    instance.status = "pending"
    instance.points_earned = 0
    instance.bonus_points = 0
    instance.penalty_points = 0
    instance.timer_ended_at = None
    instance.parent_approved_at = None

    await db.commit()
    await db.refresh(instance)
    return TaskInstanceResponse.model_validate(instance)


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


@router.put("/instances/{instance_id}/status", response_model=TaskInstanceResponse)
async def update_task_status(
    instance_id: int,
    data: TaskStatusUpdateRequest,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent updates a task instance status.

    Use cases:
    - Mark completed (kid forgot to mark it)
    - Revert to pending (kid accidentally marked done)
    - Mark as missed or skipped
    """
    valid_statuses = {"pending", "in_progress", "completed", "missed", "skipped"}
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

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

    old_status = instance.status
    instance.status = data.status
    if data.notes is not None:
        instance.notes = data.notes

    # If parent marks as completed, award points
    if data.status == "completed" and old_status != "completed":
        # Get the child to award points
        child_result = await db.execute(select(User).where(User.id == instance.child_id))
        child = child_result.scalar_one_or_none()
        if child and instance.template:
            points = instance.template.base_points or 0
            instance.points_earned = points
            child.stars = (child.stars or 0) + points
            child.xp = (child.xp or 0) + points
            child.total_tasks_completed = (child.total_tasks_completed or 0) + 1

    # If reverting from completed to pending, deduct the points back
    if old_status == "completed" and data.status == "pending":
        child_result = await db.execute(select(User).where(User.id == instance.child_id))
        child = child_result.scalar_one_or_none()
        if child and instance.points_earned:
            child.stars = max(0, (child.stars or 0) - instance.points_earned)
            child.xp = max(0, (child.xp or 0) - instance.points_earned)
            child.total_tasks_completed = max(0, (child.total_tasks_completed or 0) - 1)
            instance.points_earned = 0

    await db.commit()
    await db.refresh(instance)
    return TaskInstanceResponse.model_validate(instance)


@router.post("/templates/{template_id}/assign", response_model=TaskTemplateResponse)
async def assign_template_to_children(
    template_id: int,
    data: AssignTemplateRequest,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent assigns a task template to specific kids.

    This updates which children get instances of this template.
    """
    result = await db.execute(select(TaskTemplate).where(TaskTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.family_id != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not in your family")

    # Verify all child_ids belong to this family
    if data.child_ids:
        children_result = await db.execute(
            select(User).where(
                User.id.in_(data.child_ids),
                User.family_id == current_user.family_id,
                User.role == "child",
            )
        )
        children = children_result.scalars().all()
        if len(children) != len(data.child_ids):
            raise HTTPException(status_code=400, detail="Some child IDs are invalid or not in your family")

    # Delete future pending instances for kids no longer assigned
    # and create instances for newly assigned kids
    from datetime import date, datetime, timezone
    today = date.today()
    tomorrow = (today.isoformat(), (today.replace(day=today.day + 1) if today.day < 28 else today.isoformat()))

    # Get all future pending instances for this template
    existing_result = await db.execute(
        select(TaskInstance).where(
            TaskInstance.template_id == template_id,
            TaskInstance.status == "pending",
            TaskInstance.date >= today.isoformat(),
        )
    )
    existing_instances = existing_result.scalars().all()

    # Remove instances for unassigned kids
    for inst in existing_instances:
        if inst.child_id not in data.child_ids:
            await db.delete(inst)

    # Create instances for newly assigned kids (for today)
    existing_child_ids = {inst.child_id for inst in existing_instances}
    for child_id in data.child_ids:
        if child_id not in existing_child_ids:
            instance = TaskInstance(
                template_id=template_id,
                child_id=child_id,
                date=datetime.now(timezone.utc),
                status="pending",
            )
            db.add(instance)

    await db.commit()
    await db.refresh(template)
    return TaskTemplateResponse.model_validate(template)


@router.post("/instances/manual", response_model=TaskInstanceResponse)
async def create_manual_task_instance(
    data: ManualTaskCreateRequest,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent manually creates a single task instance for a specific kid.

    Use case: Assign 'empty the trash' to Almog for today.
    """
    result = await db.execute(select(TaskTemplate).where(TaskTemplate.id == data.template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.family_id != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not in your family")

    # Verify child is in the family
    child_result = await db.execute(
        select(User).where(
            User.id == data.child_id,
            User.family_id == current_user.family_id,
            User.role == "child",
        )
    )
    child = child_result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=400, detail="Child not found in your family")

    task_date = data.date or datetime.now(timezone.utc)

    instance = TaskInstance(
        template_id=data.template_id,
        child_id=data.child_id,
        date=task_date,
        status="pending",
    )
    db.add(instance)
    await db.commit()
    await db.refresh(instance)

    # Load template for response
    await db.refresh(instance, ["template"])
    return TaskInstanceResponse.model_validate(instance)


@router.get("/all-instances", response_model=list[TaskInstanceResponse])
async def get_all_family_instances(
    child_id: int | None = None,
    status: str | None = None,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent views all task instances across all kids, with optional filters."""
    query = (
        select(TaskInstance)
        .options(selectinload(TaskInstance.template), selectinload(TaskInstance.child))
        .where(TaskInstance.template.has(TaskTemplate.family_id == current_user.family_id))
    )
    if child_id:
        query = query.where(TaskInstance.child_id == child_id)
    if status:
        query = query.where(TaskInstance.status == status)
    query = query.order_by(TaskInstance.date.desc()).limit(200)
    result = await db.execute(query)
    instances = result.scalars().all()
    return [TaskInstanceResponse.model_validate(i) for i in instances]
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

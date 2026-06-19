"""Template marketplace API routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from ..core.database import get_db
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User
from ..models.task import TaskTemplate
from ..schemas.task import TaskTemplateResponse, TemplateRateRequest

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/marketplace", response_model=list[TaskTemplateResponse])
async def browse_marketplace(
    age_tier: int | None = Query(None, description="Filter by age tier"),
    category: str | None = Query(None, description="Filter by category"),
    task_type: str | None = Query(None, description="Filter by task type"),
    search: str | None = Query(None, description="Search in name/description"),
    sort_by: str = Query("rating", description="Sort: rating, newest, popular"),
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Browse public templates in the marketplace."""
    conditions = [TaskTemplate.public == True, TaskTemplate.is_active == True]

    if age_tier:
        conditions.append(
            and_(TaskTemplate.age_tier_min <= age_tier, TaskTemplate.age_tier_max >= age_tier)
        )
    if category:
        conditions.append(TaskTemplate.category == category)
    if task_type:
        conditions.append(TaskTemplate.task_type == task_type)
    if search:
        conditions.append(
            or_(
                TaskTemplate.name.ilike(f"%{search}%"),
                TaskTemplate.description.ilike(f"%{search}%"),
            )
        )

    query = select(TaskTemplate).where(and_(*conditions))

    if sort_by == "newest":
        query = query.order_by(TaskTemplate.created_at.desc())
    elif sort_by == "popular":
        query = query.order_by(TaskTemplate.community_ratings_count.desc())
    else:  # rating
        # Avoid division by zero
        query = query.order_by(
            (TaskTemplate.community_rating * 1.0 / func.coalesce(func.nullif(TaskTemplate.community_ratings_count, 0), 1)).desc()
        )

    result = await db.execute(query.limit(50))
    templates = result.scalars().all()
    return [TaskTemplateResponse.model_validate(t) for t in templates]


@router.get("/marketplace/categories")
async def marketplace_categories(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Get distinct categories available in the marketplace."""
    result = await db.execute(
        select(TaskTemplate.category, func.count(TaskTemplate.id))
        .where(TaskTemplate.public == True, TaskTemplate.is_active == True)
        .group_by(TaskTemplate.category)
    )
    cats = result.all()
    return [{"category": c, "count": n} for c, n in cats if c]


@router.post("/{template_id}/fork", response_model=TaskTemplateResponse)
async def fork_template(
    template_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Fork a public template into your family."""
    result = await db.execute(
        select(TaskTemplate).where(
            and_(TaskTemplate.id == template_id, TaskTemplate.public == True)
        )
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Template not found or not public")

    # Create a copy for the user's family
    forked = TaskTemplate(
        family_id=current_user.family_id,
        created_by_id=current_user.id,
        name=f"{original.name} (from marketplace)",
        description=original.description,
        category=original.category,
        task_type=original.task_type,
        base_points=original.base_points,
        timer_duration=original.timer_duration,
        pomodoro_cycles=original.pomodoro_cycles,
        break_duration=original.break_duration,
        subtasks=original.subtasks,
        all_complete_bonus=original.all_complete_bonus,
        max_asks=original.max_asks,
        bonus_first_ask=original.bonus_first_ask,
        penalty_per_ask=original.penalty_per_ask,
        early_finish_bonus_per_min=original.early_finish_bonus_per_min,
        overstay_penalty_per_min=original.overstay_penalty_per_min,
        schedule_type=original.schedule_type,
        schedule_days=original.schedule_days,
        time_window_start=original.time_window_start,
        time_window_end=original.time_window_end,
        age_tier_min=original.age_tier_min,
        age_tier_max=original.age_tier_max,
        requires_photo=original.requires_photo,
        requires_approval=original.requires_approval,
        public=False,  # Forked copy is private
    )
    db.add(forked)
    await db.commit()
    await db.refresh(forked)
    return TaskTemplateResponse.model_validate(forked)


@router.post("/{template_id}/rate")
async def rate_template(
    template_id: int,
    data: TemplateRateRequest,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Rate a marketplace template."""
    result = await db.execute(
        select(TaskTemplate).where(
            and_(TaskTemplate.id == template_id, TaskTemplate.public == True)
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=422, detail="Rating must be between 1 and 5")

    template.community_rating = (template.community_rating or 0) + data.rating
    template.community_ratings_count = (template.community_ratings_count or 0) + 1
    await db.commit()

    avg = template.community_rating / template.community_ratings_count
    return {"message": "Rating submitted", "average_rating": round(avg, 1)}

"""Task suggestions API — AI-powered task optimization."""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from sqlalchemy import select

from ..core.database import get_db
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User
from ..models.task import TaskTemplate
from ..models.reward import Reward
from ..models.task_suggestion import TaskSuggestion
from ..services.task_suggestions import generate_suggestions

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


class SuggestionResponse(BaseModel):
    id: int
    suggestion_type: str
    title: str
    description: str | None = None
    reason: str | None = None
    related_task_id: int | None = None
    suggested_change: dict | None = None
    status: str
    created_at: str | None = None

    model_config = {"from_attributes": True}


@router.get("/tasks", response_model=list[SuggestionResponse])
async def get_suggestions(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
    refresh: bool = False,
):
    """Get task suggestions for the family. Set refresh=true to regenerate."""
    if current_user.family_id is None:
        raise HTTPException(status_code=400, detail="No family associated")

    if refresh:
        await generate_suggestions(db, current_user.family_id)
        await db.commit()

    result = await db.execute(
        select(TaskSuggestion)
        .where(TaskSuggestion.family_id == current_user.family_id)
        .order_by(
            TaskSuggestion.status.asc(),  # pending first
            TaskSuggestion.created_at.desc(),
        )
        .limit(20)
    )
    suggestions = result.scalars().all()

    return [
        SuggestionResponse(
            id=s.id,
            suggestion_type=s.suggestion_type,
            title=s.title,
            description=s.description,
            reason=s.reason,
            related_task_id=s.related_task_id,
            suggested_change=json.loads(s.suggested_change) if s.suggested_change else None,
            status=s.status,
            created_at=s.created_at.isoformat() if s.created_at else None,
        )
        for s in suggestions
    ]


@router.post("/{suggestion_id}/apply")
async def apply_suggestion(
    suggestion_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Apply a suggestion — creates or edits the relevant task/reward."""
    result = await db.execute(select(TaskSuggestion).where(TaskSuggestion.id == suggestion_id))
    suggestion = result.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    if suggestion.family_id != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not in your family")
    if suggestion.status != "pending":
        raise HTTPException(status_code=400, detail="Suggestion already handled")

    change = json.loads(suggestion.suggested_change) if suggestion.suggested_change else {}

    if suggestion.suggestion_type == "timer" and suggestion.related_task_id:
        template_result = await db.execute(
            select(TaskTemplate).where(TaskTemplate.id == suggestion.related_task_id)
        )
        template = template_result.scalar_one_or_none()
        if template and "new_timer_duration" in change:
            template.timer_duration = change["new_timer_duration"]

    elif suggestion.suggestion_type == "difficulty" and suggestion.related_task_id:
        # Mark the suggestion as applied; parent handles the actual split manually
        pass

    elif suggestion.suggestion_type == "schedule":
        # Schedule shift is advisory; parent handles via settings
        pass

    elif suggestion.suggestion_type == "new_task":
        new_name = change.get("new_task_name", "New Task")
        base_points = change.get("base_points", 10)
        task_type = change.get("task_type", "one_shot")
        template = TaskTemplate(
            family_id=current_user.family_id,
            created_by_id=current_user.id,
            name=new_name,
            task_type=task_type,
            base_points=base_points,
            age_tier_min=1,
            age_tier_max=5,
        )
        db.add(template)

    elif suggestion.suggestion_type == "pricing":
        reward_id = change.get("reward_id")
        new_cost = change.get("new_cost_stars")
        if reward_id and new_cost:
            reward_result = await db.execute(select(Reward).where(Reward.id == reward_id))
            reward = reward_result.scalar_one_or_none()
            if reward and reward.family_id == current_user.family_id:
                reward.cost_stars = new_cost

    suggestion.status = "applied"
    await db.commit()
    return {"message": "Suggestion applied"}


@router.post("/{suggestion_id}/dismiss")
async def dismiss_suggestion(
    suggestion_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Dismiss a suggestion."""
    result = await db.execute(select(TaskSuggestion).where(TaskSuggestion.id == suggestion_id))
    suggestion = result.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    if suggestion.family_id != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not in your family")

    suggestion.status = "dismissed"
    await db.commit()
    return {"message": "Suggestion dismissed"}

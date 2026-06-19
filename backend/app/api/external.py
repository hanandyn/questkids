"""External API routes for third-party integrations (using API key auth)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..core.database import get_db
from ..core.apikey_auth import verify_api_key, require_scope
from ..models.apikey import ApiKey
from ..models.task import TaskInstance, TaskTemplate
from ..models.user import User
from ..models.reward import Reward
from ..schemas.task import TaskInstanceResponse
from ..schemas.reward import RewardResponse

router = APIRouter(prefix="/api/v1/external", tags=["external"])


@router.get("/tasks", response_model=list[TaskInstanceResponse])
async def external_get_tasks(
    child_id: int | None = Query(None),
    api_key: ApiKey = Depends(require_scope("read:tasks")),
    db: AsyncSession = Depends(get_db),
):
    """Get task instances for a family via API key."""
    query = select(TaskInstance).where(
        TaskInstance.template.has(TaskTemplate.family_id == api_key.family_id)
    )
    if child_id:
        query = query.where(TaskInstance.child_id == child_id)

    result = await db.execute(query)
    instances = result.scalars().all()
    return [TaskInstanceResponse.model_validate(i) for i in instances]


@router.get("/children")
async def external_get_children(
    api_key: ApiKey = Depends(require_scope("read:children")),
    db: AsyncSession = Depends(get_db),
):
    """Get children in the family via API key."""
    result = await db.execute(
        select(User).where(
            and_(User.family_id == api_key.family_id, User.role == "child")
        )
    )
    children = result.scalars().all()
    return [{
        "id": c.id,
        "display_name": c.display_name,
        "age_tier": c.age_tier,
        "level": c.level,
        "stars": c.stars,
        "gems": c.gems,
        "current_streak": c.current_streak,
    } for c in children]


@router.get("/rewards", response_model=list[RewardResponse])
async def external_get_rewards(
    api_key: ApiKey = Depends(require_scope("read:rewards")),
    db: AsyncSession = Depends(get_db),
):
    """Get rewards in the family via API key."""
    result = await db.execute(
        select(Reward).where(
            and_(Reward.family_id == api_key.family_id, Reward.is_active == True)
        )
    )
    rewards = result.scalars().all()
    return [RewardResponse.model_validate(r) for r in rewards]

"""Reward shop API routes."""

from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, Query, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from ..core.database import get_db
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User
from ..models.reward import Reward, RewardRedemption
from ..models.reward_request import RewardRequest
from ..schemas.reward import RewardCreate, RewardResponse, RedemptionResponse, RewardRequestCreate, RewardRequestResponse, RewardRequestResolve

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.post("", response_model=RewardResponse)
async def create_reward(
    data: RewardCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent creates a reward."""
    reward = Reward(
        family_id=current_user.family_id,
        created_by_id=current_user.id,
        **data.model_dump(),
    )
    db.add(reward)
    await db.commit()
    await db.refresh(reward)
    return RewardResponse.model_validate(reward)


@router.get("", response_model=list[RewardResponse])
async def get_rewards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all rewards for the family."""
    result = await db.execute(
        select(Reward).where(
            and_(Reward.family_id == current_user.family_id, Reward.is_active == True)
        )
    )
    rewards = result.scalars().all()
    return [RewardResponse.model_validate(r) for r in rewards]


@router.delete("/{reward_id}")
async def delete_reward(
    reward_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a reward."""
    result = await db.execute(
        select(Reward).where(
            and_(Reward.id == reward_id, Reward.family_id == current_user.family_id)
        )
    )
    reward = result.scalar_one_or_none()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    reward.is_active = False
    await db.commit()
    return {"message": "Reward deleted"}


@router.post("/{reward_id}/redeem", response_model=RedemptionResponse)
async def redeem_reward(
    reward_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A child redeems a reward from the shop."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can redeem rewards")

    result = await db.execute(
        select(Reward).where(and_(Reward.id == reward_id, Reward.is_active == True))
    )
    reward = result.scalar_one_or_none()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    if reward.family_id != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not in your family")

    # Check age restrictions
    if reward.age_min and current_user.age_tier and current_user.age_tier < reward.age_min:
        raise HTTPException(status_code=403, detail="You're not old enough for this reward")
    if reward.age_max and current_user.age_tier and current_user.age_tier > reward.age_max:
        raise HTTPException(status_code=403, detail="You've outgrown this reward")

    # Check weekly limit
    if reward.limit_per_week > 0:
        # Count this week's redemptions for this child
        from datetime import date, timedelta
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        weekly_count = await db.execute(
            select(RewardRedemption).where(
                and_(
                    RewardRedemption.reward_id == reward_id,
                    RewardRedemption.child_id == current_user.id,
                    RewardRedemption.redeemed_at >= week_start,
                )
            )
        )
        if len(weekly_count.scalars().all()) >= reward.limit_per_week:
            raise HTTPException(status_code=403, detail="Weekly limit reached for this reward")

    # Check balance
    if reward.cost_stars > current_user.stars:
        raise HTTPException(status_code=403, detail="Not enough stars")
    if reward.cost_gems > current_user.gems:
        raise HTTPException(status_code=403, detail="Not enough gems")

    # Deduct and create redemption
    current_user.stars -= reward.cost_stars
    current_user.gems -= reward.cost_gems

    redemption = RewardRedemption(
        reward_id=reward_id,
        child_id=current_user.id,
        status="approved" if not reward.requires_approval else "pending",
    )
    db.add(redemption)
    await db.commit()
    await db.refresh(redemption)

    return RedemptionResponse.model_validate(redemption)


@router.get("/redemptions", response_model=list[RedemptionResponse])
async def get_redemptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    child_id: int | None = None,
):
    """Get reward redemptions. Parents see all; children see their own."""
    if current_user.role == "parent":
        query = select(RewardRedemption).where(
            RewardRedemption.reward.has(Reward.family_id == current_user.family_id)
        )
        if child_id:
            query = query.where(RewardRedemption.child_id == child_id)
    else:
        query = select(RewardRedemption).where(RewardRedemption.child_id == current_user.id)

    result = await db.execute(
        query.options(selectinload(RewardRedemption.reward)).order_by(
            RewardRedemption.redeemed_at.desc()
        )
    )
    redemptions = result.scalars().all()
    return [RedemptionResponse.model_validate(r) for r in redemptions]


@router.post("/requests", response_model=RewardRequestResponse)
async def create_reward_request(
    data: RewardRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A child requests a new reward to be added to the shop."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can request rewards")
    request = RewardRequest(
        family_id=current_user.family_id,
        child_id=current_user.id,
        name=data.name,
        description=data.description,
        suggested_cost_stars=data.suggested_cost_stars,
        category=data.category,
    )
    db.add(request)
    await db.commit()
    await db.refresh(request)
    return RewardRequestResponse.model_validate(request)


@router.get("/requests", response_model=list[RewardRequestResponse])
async def get_reward_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get reward requests. Parents see all; children see their own."""
    if current_user.role == "parent":
        query = select(RewardRequest).where(RewardRequest.family_id == current_user.family_id)
    else:
        query = select(RewardRequest).where(RewardRequest.child_id == current_user.id)
    result = await db.execute(query.order_by(RewardRequest.created_at.desc()))
    return [RewardRequestResponse.model_validate(r) for r in result.scalars().all()]


@router.post("/requests/{request_id}/resolve", response_model=RewardRequestResponse)
async def resolve_reward_request(
    request_id: int,
    data: RewardRequestResolve,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent approves (creates reward) or rejects a reward request."""
    from datetime import datetime, timezone
    result = await db.execute(
        select(RewardRequest).where(
            and_(RewardRequest.id == request_id, RewardRequest.family_id == current_user.family_id)
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Already resolved")

    if data.approved:
        # Create the reward in the shop
        reward = Reward(
            family_id=current_user.family_id,
            created_by_id=current_user.id,
            name=req.name,
            description=req.description,
            category=req.category,
            cost_stars=data.cost_stars,
            cost_gems=data.cost_gems,
        )
        db.add(reward)
        req.status = "approved"
    else:
        req.status = "rejected"

    req.parent_notes = data.notes
    req.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)
    return RewardRequestResponse.model_validate(req)
@router.post("/redemptions/{redemption_id}/approve", response_model=RedemptionResponse)
async def approve_redemption(
    redemption_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent approves a redemption."""
    result = await db.execute(
        select(RewardRedemption)
        .options(selectinload(RewardRedemption.reward))
        .where(RewardRedemption.id == redemption_id)
    )
    redemption = result.scalar_one_or_none()
    if not redemption:
        raise HTTPException(status_code=404, detail="Redemption not found")
    if redemption.reward.family_id != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not in your family")

    redemption.status = "approved"
    await db.commit()
    await db.refresh(redemption)
    return RedemptionResponse.model_validate(redemption)


class FulfillRequest(BaseModel):
    notes: str | None = None


@router.post("/redemptions/{redemption_id}/fulfill", response_model=RedemptionResponse)
async def fulfill_redemption(
    redemption_id: int,
    data: FulfillRequest = FulfillRequest(),
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent marks a reward as delivered to the child."""
    result = await db.execute(
        select(RewardRedemption)
        .options(selectinload(RewardRedemption.reward))
        .where(RewardRedemption.id == redemption_id)
    )
    redemption = result.scalar_one_or_none()
    if not redemption:
        raise HTTPException(status_code=404, detail="Redemption not found")
    if redemption.reward.family_id != current_user.family_id:
        raise HTTPException(status_code=403, detail="Not in your family")
    if redemption.status == "fulfilled":
        raise HTTPException(status_code=400, detail="Already fulfilled")

    from datetime import datetime, timezone
    redemption.status = "fulfilled"
    redemption.fulfilled_at = datetime.now(timezone.utc)
    if data.notes:
        redemption.notes = data.notes
    await db.commit()
    await db.refresh(redemption)
    return RedemptionResponse.model_validate(redemption)


@router.post("/redemptions/{redemption_id}/cancel", response_model=RedemptionResponse)
async def cancel_redemption(
    redemption_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Child cancels an unfulfilled redemption to get stars back."""
    result = await db.execute(
        select(RewardRedemption)
        .options(selectinload(RewardRedemption.reward))
        .where(RewardRedemption.id == redemption_id)
    )
    redemption = result.scalar_one_or_none()
    if not redemption:
        raise HTTPException(status_code=404, detail="Redemption not found")

    # Only the child who made it can cancel
    if current_user.id != redemption.child_id:
        raise HTTPException(status_code=403, detail="Only the child who redeemed can cancel")
    if redemption.status == "fulfilled":
        raise HTTPException(status_code=400, detail="Already fulfilled — cannot cancel")
    if redemption.status in ("rejected", "cancelled"):
        raise HTTPException(status_code=400, detail="Already cancelled or rejected")

    # Refund stars and gems
    reward = redemption.reward
    child = await db.get(User, redemption.child_id)
    if child:
        child.stars += reward.cost_stars
        child.gems += reward.cost_gems

    redemption.status = "cancelled"
    await db.commit()
    await db.refresh(redemption)
    return RedemptionResponse.model_validate(redemption)


@router.get("/redemptions/pending", response_model=list[RedemptionResponse])
async def get_pending_fulfillments(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent sees pending reward redemptions that need fulfillment."""
    result = await db.execute(
        select(RewardRedemption)
        .options(selectinload(RewardRedemption.reward))
        .where(
            RewardRedemption.reward.has(Reward.family_id == current_user.family_id),
            RewardRedemption.status.in_(["pending", "approved"]),
        )
        .order_by(RewardRedemption.redeemed_at.asc())
    )
    redemptions = result.scalars().all()
    return [RedemptionResponse.model_validate(r) for r in redemptions]

"""Cheers API routes — sibling encouragement system."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..schemas.social import CheerCreate, CheerResponse, CheersReceived
from ..services.cheers import send_cheer, get_received_cheers, get_today_cheer_count

router = APIRouter(prefix="/cheers", tags=["cheers"])


@router.post("")
async def send_cheer_route(
    data: CheerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a cheer to a sibling (max 3 per day)."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can send cheers")

    result = await send_cheer(
        db,
        from_child_id=current_user.id,
        to_child_id=data.to_child_id,
        message_type=data.message_type,
        task_instance_id=data.task_instance_id,
    )

    if not result["success"]:
        raise HTTPException(status_code=403, detail=result["message"])

    return result


@router.get("/received", response_model=CheersReceived)
async def get_received_cheers_route(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all cheers received by the current child."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can receive cheers")

    cheers = await get_received_cheers(db, current_user.id)
    today_count = await get_today_cheer_count(db, current_user.id)

    return CheersReceived(
        cheers=[CheerResponse(**c) for c in cheers[:50]],  # limit to 50
        today_count=today_count,
        max_daily=3,
    )


@router.get("/sent-today")
async def get_cheers_sent_today(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get how many cheers the current child has sent today."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children")
    count = await get_today_cheer_count(db, current_user.id)
    return {"count": count, "remaining": max(0, 3 - count)}

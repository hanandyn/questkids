"""Family messages API — communication within a family."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from sqlalchemy import select, func

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..models.family_message import FamilyMessage

router = APIRouter(prefix="/family", tags=["messages"])


class MessageCreate(BaseModel):
    message: str
    type: str = "cheer"  # announcement, cheer, reminder
    pinned: bool = False


class MessageResponse(BaseModel):
    id: int
    family_id: int
    sender_id: int | None = None
    sender_name: str | None = None
    message: str
    type: str
    pinned: bool
    created_at: str | None = None

    model_config = {"from_attributes": True}


@router.post("/messages", response_model=MessageResponse)
async def send_message(
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the family board."""
    if current_user.family_id is None:
        raise HTTPException(status_code=400, detail="No family associated")

    # Only parents can make announcements
    if data.type == "announcement" and current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can post announcements")
    # Kids can only send cheery messages
    if current_user.role == "child" and data.type not in ("cheer",):
        raise HTTPException(status_code=403, detail="Kids can only send cheers")

    msg = FamilyMessage(
        family_id=current_user.family_id,
        sender_id=current_user.id,
        message=data.message,
        type=data.type,
        pinned=data.pinned,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    return MessageResponse(
        id=msg.id,
        family_id=msg.family_id,
        sender_id=msg.sender_id,
        sender_name=current_user.display_name,
        message=msg.message,
        type=msg.type,
        pinned=msg.pinned,
        created_at=msg.created_at.isoformat() if msg.created_at else None,
    )


@router.get("/messages", response_model=list[MessageResponse])
async def get_messages(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    """Get recent family messages. Pinned announcements first, then by recency."""
    if current_user.family_id is None:
        raise HTTPException(status_code=400, detail="No family associated")

    result = await db.execute(
        select(FamilyMessage)
        .where(FamilyMessage.family_id == current_user.family_id)
        .order_by(FamilyMessage.pinned.desc(), FamilyMessage.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()

    # Get sender names
    sender_ids = {m.sender_id for m in messages if m.sender_id}
    sender_names = {}
    if sender_ids:
        senders_result = await db.execute(
            select(User.id, User.display_name).where(User.id.in_(sender_ids))
        )
        for sid, sname in senders_result:
            sender_names[sid] = sname

    return [
        MessageResponse(
            id=m.id,
            family_id=m.family_id,
            sender_id=m.sender_id,
            sender_name=sender_names.get(m.sender_id, "System") if m.sender_id else "System",
            message=m.message,
            type=m.type,
            pinned=m.pinned,
            created_at=m.created_at.isoformat() if m.created_at else None,
        )
        for m in messages
    ]

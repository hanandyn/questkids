"""Cheer service — sibling encouragement with daily limits."""

from datetime import date
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.cheer import Cheer
from ..models.user import User


async def send_cheer(
    db: AsyncSession,
    from_child_id: int,
    to_child_id: int,
    message_type: str,
    task_instance_id: int | None = None,
) -> dict:
    """Send a cheer from one child to another. Enforces 3 cheers/day limit."""
    today = date.today()

    # Count today's cheers from this child
    # Use >= today at midnight to handle SQLite date comparison
    from datetime import datetime, time
    today_start = datetime.combine(today, time.min)
    
    count_result = await db.execute(
        select(func.count(Cheer.id)).where(
            and_(
                Cheer.from_child_id == from_child_id,
                Cheer.created_at >= today_start,
            )
        )
    )
    today_count = count_result.scalar() or 0

    if today_count >= 3:
        return {"success": False, "message": "You've used all 3 cheers for today!", "today_count": today_count}

    valid_types = {"clap", "celebrate", "lightning", "muscle", "star"}
    if message_type not in valid_types:
        message_type = "clap"

    # Verify they're in the same family
    from_result = await db.execute(select(User).where(User.id == from_child_id))
    to_result = await db.execute(select(User).where(User.id == to_child_id))
    from_user = from_result.scalar_one_or_none()
    to_user = to_result.scalar_one_or_none()

    if not from_user or not to_user:
        return {"success": False, "message": "User not found", "today_count": today_count}
    if from_user.family_id != to_user.family_id:
        return {"success": False, "message": "Not in the same family", "today_count": today_count}
    if from_user.role != "child" or to_user.role != "child":
        return {"success": False, "message": "Only children can send/receive cheers", "today_count": today_count}

    cheer = Cheer(
        from_child_id=from_child_id,
        to_child_id=to_child_id,
        task_instance_id=task_instance_id,
        message_type=message_type,
    )
    db.add(cheer)
    await db.commit()

    # Small mood boost: give the receiver 5 bonus stars
    to_user.stars += 5
    await db.commit()

    return {
        "success": True,
        "message": f"Cheer sent! {to_user.display_name} gets +5 ⭐!",
        "today_count": today_count + 1,
    }


async def get_received_cheers(db: AsyncSession, child_id: int) -> list[dict]:
    """Get all cheers received by a child."""
    result = await db.execute(
        select(Cheer).where(Cheer.to_child_id == child_id).order_by(Cheer.created_at.desc())
    )
    cheers = result.scalars().all()

    cheer_list = []
    for cheer in cheers:
        from_user_result = await db.execute(select(User).where(User.id == cheer.from_child_id))
        from_user = from_user_result.scalar_one_or_none()

        cheer_list.append({
            "id": cheer.id,
            "from_child_id": cheer.from_child_id,
            "from_child_name": from_user.display_name if from_user else "Unknown",
            "to_child_id": cheer.to_child_id,
            "task_instance_id": cheer.task_instance_id,
            "message_type": cheer.message_type,
            "created_at": cheer.created_at,
        })

    return cheer_list


async def get_today_cheer_count(db: AsyncSession, child_id: int) -> int:
    """Get how many cheers a child has sent today."""
    from datetime import datetime, time
    today_start = datetime.combine(date.today(), time.min)
    count_result = await db.execute(
        select(func.count(Cheer.id)).where(
            and_(
                Cheer.from_child_id == child_id,
                Cheer.created_at >= today_start,
            )
        )
    )
    return count_result.scalar() or 0

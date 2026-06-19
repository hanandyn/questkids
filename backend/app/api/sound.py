"""Sound settings API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from sqlalchemy import select

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..models.sound_settings import SoundSettings

router = APIRouter(prefix="/settings", tags=["sound"])


class SoundSettingsData(BaseModel):
    master_volume: float = 0.7
    music_volume: float = 0.5
    sfx_volume: float = 0.7
    muted: bool = False


@router.get("/sound", response_model=SoundSettingsData)
async def get_sound_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get sound settings for the current user."""
    result = await db.execute(
        select(SoundSettings).where(SoundSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()
    if not settings:
        return SoundSettingsData()
    return SoundSettingsData(
        master_volume=settings.master_volume,
        music_volume=settings.music_volume,
        sfx_volume=settings.sfx_volume,
        muted=settings.muted,
    )


@router.put("/sound", response_model=SoundSettingsData)
async def update_sound_settings(
    data: SoundSettingsData,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update sound settings for the current user."""
    result = await db.execute(
        select(SoundSettings).where(SoundSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()

    if settings:
        settings.master_volume = max(0, min(1, data.master_volume))
        settings.music_volume = max(0, min(1, data.music_volume))
        settings.sfx_volume = max(0, min(1, data.sfx_volume))
        settings.muted = data.muted
    else:
        settings = SoundSettings(
            user_id=current_user.id,
            master_volume=round(max(0, min(1, data.master_volume)), 2),
            music_volume=round(max(0, min(1, data.music_volume)), 2),
            sfx_volume=round(max(0, min(1, data.sfx_volume)), 2),
            muted=data.muted,
        )
        db.add(settings)

    await db.commit()
    await db.refresh(settings)
    return data

"""Integration API routes — API key management for third-party access."""

import secrets
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..core.database import get_db
from ..core.auth import get_current_parent
from ..models.user import User
from ..models.apikey import ApiKey
from ..schemas.apikey import ApiKeyCreate, ApiKeyResponse, ApiKeyCreatedResponse

router = APIRouter(prefix="/integrations", tags=["integrations"])


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


@router.post("/keys", response_model=ApiKeyCreatedResponse)
async def create_api_key(
    data: ApiKeyCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new API key for third-party integrations."""
    raw_key = f"qk_{secrets.token_hex(24)}"
    key_hash = hash_key(raw_key)

    valid_scopes = {"read:tasks", "write:tasks", "read:children", "read:rewards"}
    for scope in data.scopes:
        if scope not in valid_scopes:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid scope: {scope}. Valid: {', '.join(sorted(valid_scopes))}"
            )

    api_key = ApiKey(
        family_id=current_user.family_id,
        key_hash=key_hash,
        name=data.name,
        scopes=data.scopes,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return ApiKeyCreatedResponse(
        id=api_key.id,
        name=api_key.name,
        key=raw_key,
        scopes=api_key.scopes,
        created_at=api_key.created_at,
    )


@router.get("/keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """List all API keys for the family."""
    result = await db.execute(
        select(ApiKey).where(
            and_(ApiKey.family_id == current_user.family_id, ApiKey.revoked == False)
        )
    )
    keys = result.scalars().all()
    return [ApiKeyResponse.model_validate(k) for k in keys]


@router.delete("/keys/{key_id}")
async def revoke_api_key(
    key_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an API key."""
    result = await db.execute(
        select(ApiKey).where(
            and_(
                ApiKey.id == key_id,
                ApiKey.family_id == current_user.family_id,
            )
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.revoked = True
    await db.commit()
    return {"message": "API key revoked"}

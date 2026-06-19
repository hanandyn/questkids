"""API key authentication for third-party integrations."""

import hashlib
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from ..core.database import get_db
from ..models.apikey import ApiKey


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


async def verify_api_key(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ApiKey:
    """Verify x-api-key header and return the valid key record."""
    api_key = request.headers.get("x-api-key")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing x-api-key header",
        )

    key_hash = hash_key(api_key)
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.key_hash == key_hash,
            ApiKey.revoked == False,
        )
    )
    key_record = result.scalar_one_or_none()

    if not key_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    # Update last_used
    key_record.last_used = datetime.now(timezone.utc)
    await db.commit()

    return key_record


def require_scope(scope: str):
    """Dependency factory for scope checking."""
    async def check_scope(
        api_key: ApiKey = Depends(verify_api_key),
    ) -> ApiKey:
        if scope not in api_key.scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"API key missing scope: {scope}",
            )
        return api_key
    return check_scope

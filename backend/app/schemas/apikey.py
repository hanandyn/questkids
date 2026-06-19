"""Pydantic schemas for integrations (API keys)."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ApiKeyCreate(BaseModel):
    name: str
    scopes: List[str] = ["read:tasks"]


class ApiKeyResponse(BaseModel):
    id: int
    name: str
    scopes: List[str]
    created_at: Optional[datetime] = None
    last_used: Optional[datetime] = None
    revoked: bool

    model_config = {"from_attributes": True}


class ApiKeyCreatedResponse(BaseModel):
    id: int
    name: str
    key: str  # only returned once, at creation
    scopes: List[str]
    created_at: Optional[datetime] = None

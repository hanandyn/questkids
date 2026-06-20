"""Pydantic schemas for reward models."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RewardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    cost_stars: int = 0
    cost_gems: int = 0
    age_min: int = 3
    age_max: int = 18
    availability: str = "always"
    limit_per_week: int = 0
    requires_approval: bool = True
    image_url: Optional[str] = None


class RewardResponse(BaseModel):
    id: int
    family_id: int
    created_by_id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    cost_stars: int
    cost_gems: int
    age_min: int
    age_max: int
    availability: str
    limit_per_week: int
    requires_approval: bool
    is_active: bool
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RedemptionResponse(BaseModel):
    id: int
    reward_id: int
    child_id: int
    status: str
    redeemed_at: Optional[datetime] = None
    fulfilled_at: Optional[datetime] = None
    notes: Optional[str] = None
    reward: Optional[RewardResponse] = None

    model_config = {"from_attributes": True}


class RewardRequestCreate(BaseModel):
    name: str
    description: Optional[str] = None
    suggested_cost_stars: int = 0
    category: Optional[str] = None


class RewardRequestResponse(BaseModel):
    id: int
    family_id: int
    child_id: int
    name: str
    description: Optional[str] = None
    suggested_cost_stars: int
    category: Optional[str] = None
    status: str
    parent_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RewardRequestResolve(BaseModel):
    approved: bool
    cost_stars: int = 0
    cost_gems: int = 0
    notes: Optional[str] = None

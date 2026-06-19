"""Pydantic schemas for user models."""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    username: str
    display_name: str
    role: str  # "parent" or "child"
    family_id: Optional[int] = None
    age_tier: Optional[int] = None


class UserCreate(UserBase):
    password: str
    email: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    age_tier: Optional[int] = None
    level: Optional[int] = None
    xp: Optional[int] = None
    stars: Optional[int] = None
    gems: Optional[int] = None
    current_streak: Optional[int] = None
    longest_streak: Optional[int] = None
    freeze_tokens: Optional[int] = None
    avatar_config: Optional[str] = None
    theme_preference: Optional[str] = None
    handicap_multiplier: Optional[int] = None
    last_daily_spin: Optional[datetime] = None
    completed_since_last_chest: Optional[int] = None
    total_tasks_completed: Optional[int] = None


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str
    email: Optional[str] = None
    role: str
    family_id: Optional[int] = None
    age_tier: Optional[int] = None
    level: int
    xp: int
    stars: int
    gems: int
    current_streak: int
    longest_streak: int
    freeze_tokens: int
    avatar_config: Optional[str] = None
    theme_preference: Optional[str] = None
    handicap_multiplier: int
    last_daily_spin: Optional[datetime] = None
    completed_since_last_chest: int
    total_tasks_completed: int
    email_verified: bool = False
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class FamilyResponse(BaseModel):
    id: int
    name: str
    competition_mode: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class FamilyCreate(BaseModel):
    name: str

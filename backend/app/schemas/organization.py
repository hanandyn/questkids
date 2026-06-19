"""Pydantic schemas for organizations."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class OrganizationCreate(BaseModel):
    name: str
    type: str = "school"  # school, classroom, youth_group, scouts


class OrganizationResponse(BaseModel):
    id: int
    name: str
    type: str
    code: str
    created_by_id: int
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class OrganizationJoin(BaseModel):
    code: str


class OrganizationMemberResponse(BaseModel):
    id: int
    org_id: int
    family_id: int
    role: str
    joined_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class OrganizationWithMembers(OrganizationResponse):
    members: list[OrganizationMemberResponse] = []
    member_count: int = 0

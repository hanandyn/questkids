"""Pydantic schemas for school/homework assignments."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HomeworkAssignmentCreate(BaseModel):
    child_id: int
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    due_date: Optional[datetime] = None
    points: int = 20


class HomeworkAssignmentResponse(BaseModel):
    id: int
    org_id: int
    teacher_id: int
    child_id: int
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    due_date: Optional[datetime] = None
    points: int
    status: str
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class HomeworkCompleteRequest(BaseModel):
    completed: bool = True

"""School integration API routes."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..core.database import get_db
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User
from ..models.organization import Organization, OrganizationMember
from ..models.homework import HomeworkAssignment
from ..schemas.school import (
    HomeworkAssignmentCreate, HomeworkAssignmentResponse, HomeworkCompleteRequest,
)

router = APIRouter(prefix="/school", tags=["school"])


async def require_teacher(
    org_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrganizationMember:
    """Ensure the user is a teacher/admin in the given organization."""
    result = await db.execute(
        select(OrganizationMember).where(
            and_(
                OrganizationMember.org_id == org_id,
                OrganizationMember.family_id == current_user.family_id,
                OrganizationMember.role == "admin",
            )
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Teacher access required (must be org admin)")
    return member


@router.post("/assignments", response_model=HomeworkAssignmentResponse)
async def create_assignment(
    data: HomeworkAssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Teacher assigns homework to a child. Requires org membership (admin role)."""
    # Find the first org the user is admin of
    result = await db.execute(
        select(OrganizationMember).where(
            and_(
                OrganizationMember.family_id == current_user.family_id,
                OrganizationMember.role == "admin",
            )
        ).limit(1)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="You must be an organization admin to assign homework")

    assignment = HomeworkAssignment(
        org_id=member.org_id,
        teacher_id=current_user.id,
        child_id=data.child_id,
        title=data.title,
        description=data.description,
        subject=data.subject,
        due_date=data.due_date,
        points=data.points,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return HomeworkAssignmentResponse.model_validate(assignment)


@router.get("/assignments", response_model=list[HomeworkAssignmentResponse])
async def get_assignments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get assignments: parents see their children's, kids see their own."""
    if current_user.role == "parent":
        # Parents see assignments for all children in their family
        result = await db.execute(
            select(HomeworkAssignment).where(
                HomeworkAssignment.child.has(User.family_id == current_user.family_id)
            ).order_by(HomeworkAssignment.created_at.desc())
        )
    else:
        result = await db.execute(
            select(HomeworkAssignment).where(
                HomeworkAssignment.child_id == current_user.id
            ).order_by(HomeworkAssignment.created_at.desc())
        )

    assignments = result.scalars().all()
    return [HomeworkAssignmentResponse.model_validate(a) for a in assignments]


@router.post("/assignments/{assignment_id}/complete", response_model=HomeworkAssignmentResponse)
async def complete_assignment(
    assignment_id: int,
    data: HomeworkCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Child marks a homework assignment as complete."""
    result = await db.execute(
        select(HomeworkAssignment).where(HomeworkAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if current_user.role == "child" and assignment.child_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your assignment")

    if data.completed:
        assignment.status = "completed"
        assignment.completed_at = datetime.now(timezone.utc)

        # Award points to child
        child_result = await db.execute(select(User).where(User.id == assignment.child_id))
        child = child_result.scalar_one_or_none()
        if child:
            child.stars += assignment.points
            child.xp += assignment.points
            child.total_tasks_completed = (child.total_tasks_completed or 0) + 1

    await db.commit()
    await db.refresh(assignment)
    return HomeworkAssignmentResponse.model_validate(assignment)

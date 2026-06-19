"""Organization API routes — multi-family/organization support."""

import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..core.database import get_db
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User, Family
from ..models.organization import Organization, OrganizationMember
from ..schemas.organization import (
    OrganizationCreate, OrganizationJoin, OrganizationResponse,
    OrganizationMemberResponse, OrganizationWithMembers,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])


def generate_code() -> str:
    return secrets.token_hex(4)[:8].upper()


@router.post("", response_model=OrganizationResponse)
async def create_organization(
    data: OrganizationCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Create a new organization."""
    code = generate_code()
    # Ensure code is unique
    for _ in range(5):
        existing = await db.execute(select(Organization).where(Organization.code == code))
        if not existing.scalar_one_or_none():
            break
        code = generate_code()

    org = Organization(
        name=data.name,
        type=data.type,
        code=code,
        created_by_id=current_user.id,
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)

    # Auto-join creator's family as admin
    member = OrganizationMember(
        org_id=org.id,
        family_id=current_user.family_id,
        role="admin",
    )
    db.add(member)
    await db.commit()

    return OrganizationResponse.model_validate(org)


@router.post("/join", response_model=OrganizationResponse)
async def join_organization(
    data: OrganizationJoin,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Join an organization by code."""
    result = await db.execute(select(Organization).where(Organization.code == data.code.upper()))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found. Check the code and try again.")

    # Check if already a member
    existing = await db.execute(
        select(OrganizationMember).where(
            and_(
                OrganizationMember.org_id == org.id,
                OrganizationMember.family_id == current_user.family_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Your family is already a member of this organization.")

    member = OrganizationMember(
        org_id=org.id,
        family_id=current_user.family_id,
        role="member",
    )
    db.add(member)
    await db.commit()

    return OrganizationResponse.model_validate(org)


@router.get("/my", response_model=list[OrganizationWithMembers])
async def my_organizations(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """List organizations the user's family belongs to."""
    result = await db.execute(
        select(Organization, OrganizationMember).join(
            OrganizationMember, Organization.id == OrganizationMember.org_id
        ).where(
            OrganizationMember.family_id == current_user.family_id
        )
    )
    rows = result.all()
    org_map: dict[int, dict] = {}
    for org, member in rows:
        if org.id not in org_map:
            org_map[org.id] = {
                "org": org,
                "members": [],
                "my_role": member.role,
            }

    # Get all members for each org
    output = []
    for org_id, data in org_map.items():
        members_result = await db.execute(
            select(OrganizationMember).where(OrganizationMember.org_id == org_id)
        )
        all_members = members_result.scalars().all()

        # Build response manually to avoid lazy-load issues
        org_data = {
            "id": data["org"].id,
            "name": data["org"].name,
            "type": data["org"].type,
            "code": data["org"].code,
            "created_by_id": data["org"].created_by_id,
            "created_at": data["org"].created_at.isoformat() if data["org"].created_at else None,
            "members": [OrganizationMemberResponse.model_validate(m).model_dump() for m in all_members],
            "member_count": len(all_members),
        }
        output.append(org_data)

    return output


@router.get("/{org_id}", response_model=OrganizationWithMembers)
async def get_organization(
    org_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Get organization details."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    # Check membership
    member_result = await db.execute(
        select(OrganizationMember).where(
            and_(
                OrganizationMember.org_id == org_id,
                OrganizationMember.family_id == current_user.family_id,
            )
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this organization.")

    # Get all members
    members_result = await db.execute(
        select(OrganizationMember).where(OrganizationMember.org_id == org_id)
    )
    all_members = members_result.scalars().all()

    org_data = {
        "id": org.id,
        "name": org.name,
        "type": org.type,
        "code": org.code,
        "created_by_id": org.created_by_id,
        "created_at": org.created_at.isoformat() if org.created_at else None,
        "members": [OrganizationMemberResponse.model_validate(m).model_dump() for m in all_members],
        "member_count": len(all_members),
    }
    return org_data


@router.delete("/{org_id}")
async def leave_organization(
    org_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Leave an organization."""
    result = await db.execute(
        select(OrganizationMember).where(
            and_(
                OrganizationMember.org_id == org_id,
                OrganizationMember.family_id == current_user.family_id,
            )
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Not a member of this organization.")

    await db.delete(member)
    await db.commit()
    return {"message": "Left organization"}

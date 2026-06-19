"""Organization and OrganizationMember models for multi-family support."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False, default="school")  # school, classroom, youth_group, scouts
    code = Column(String, unique=True, index=True, nullable=False)  # join code
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    assignments = relationship("HomeworkAssignment", back_populates="organization", cascade="all, delete-orphan")


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    role = Column(String, nullable=False, default="member")  # admin, member
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("org_id", "family_id", name="uq_org_family"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="members")

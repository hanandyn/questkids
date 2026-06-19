"""Authentication API routes."""

import uuid
import smtplib
from datetime import timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..core.config import settings
from ..core.security import hash_password, verify_password, create_access_token
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User, Family
from ..schemas.user import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    FamilyCreate, FamilyResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def get_limiter():
    """Lazy import to avoid circular dependency."""
    from ..main import limiter
    return limiter


async def check_rate_limit(request: Request, rate: str, key: str):
    """Apply rate limiting. Gracefully handles test environments."""
    try:
        limiter = get_limiter()
        # Only enforce if request has a client (real HTTP request)
        if request.client:
            await limiter.check(request, rate, key=key)
    except Exception:
        pass  # Gracefully ignore in test/degraded mode


def validate_password_strength(password: str) -> str | None:
    """Validate password meets strength requirements. Returns error message or None."""
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if not any(c.islower() for c in password):
        return "Password must contain at least one lowercase letter"
    if not any(c.isupper() for c in password):
        return "Password must contain at least one uppercase letter"
    if not any(c.isdigit() for c in password):
        return "Password must contain at least one number"
    return None


@router.post("/register-parent", response_model=TokenResponse)
async def register_parent(
    data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Register a new parent user with their family."""
    await check_rate_limit(request, "3/minute", key="register-parent")

    # Validate password strength
    pw_error = validate_password_strength(data.password)
    if pw_error:
        raise HTTPException(status_code=400, detail=pw_error)

    # Check existing username
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create family
    family = Family(name=f"{data.display_name}'s Family")
    db.add(family)
    await db.flush()

    # Create parent user
    verification_token = str(uuid.uuid4())
    user = User(
        username=data.username,
        email=data.email,
        display_name=data.display_name,
        hashed_password=hash_password(data.password),
        role="parent",
        family_id=family.id,
        verification_token=verification_token,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Send verification email in background if email is provided
    if data.email:
        await send_verification_email(data.email, verification_token)

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Login for any user (parent or child)."""
    await check_rate_limit(request, "5/minute", key="login")

    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()

    # Check account lockout
    from datetime import datetime, timezone
    if user and user.locked_until:
        if user.locked_until > datetime.now(timezone.utc):
            remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() / 60) + 1
            raise HTTPException(
                status_code=423,
                detail=f"Account locked. Try again in {remaining} minutes.",
            )
        else:
            # Lockout expired, reset
            user.locked_until = None
            user.failed_login_attempts = 0

    if not user or not verify_password(data.password, user.hashed_password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            await db.commit()
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Reset failed attempts on successful login
    if user.failed_login_attempts > 0:
        user.failed_login_attempts = 0
        user.locked_until = None
        await db.commit()

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/create-child", response_model=UserResponse)
async def create_child(
    data: UserCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent creates a child profile."""
    if data.role != "child":
        raise HTTPException(status_code=400, detail="Role must be 'child'")
    if not data.age_tier or data.age_tier < 1 or data.age_tier > 5:
        raise HTTPException(status_code=400, detail="Valid age_tier (1-5) required")

    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    child = User(
        username=data.username,
        display_name=data.display_name,
        hashed_password=hash_password(data.password),
        role="child",
        family_id=current_user.family_id,
        age_tier=data.age_tier,
    )
    db.add(child)
    await db.commit()
    await db.refresh(child)

    return UserResponse.model_validate(child)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse.model_validate(current_user)


@router.get("/family", response_model=FamilyResponse)
async def get_family(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's family info."""
    result = await db.execute(select(Family).where(Family.id == current_user.family_id))
    family = result.scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    return FamilyResponse.model_validate(family)


@router.get("/children", response_model=list[UserResponse])
async def get_children(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Get all children in the family."""
    result = await db.execute(
        select(User).where(
            User.family_id == current_user.family_id,
            User.role == "child",
        )
    )
    children = result.scalars().all()
    return [UserResponse.model_validate(c) for c in children]


# ── Email Verification ──────────────────────────────────────────────────

async def send_verification_email(email: str, token: str):
    """Send verification email via SMTP. Falls back to logging if SMTP is not configured."""
    verify_url = f"{settings.BASE_URL}/verify-email?token={token}"

    subject = "Verify your email — QuestKids 🏰"
    body = f"""
    <h2>Welcome to QuestKids! 🏰</h2>
    <p>Click the link below to verify your email address:</p>
    <p><a href="{verify_url}" style="padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;">Verify Email</a></p>
    <p>Or copy this URL: {verify_url}</p>
    <p>If you didn't create a QuestKids account, you can ignore this email.</p>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = email
        msg.attach(MIMEText(body, "html"))

        if settings.SMTP_HOST and settings.SMTP_HOST != "localhost":
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
    except Exception as e:
        # Log but don't fail registration
        import logging
        logging.getLogger(__name__).warning(f"Failed to send verification email: {e}")


@router.post("/verify-email/{token}")
async def verify_email(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Verify user email with token."""
    result = await db.execute(
        select(User).where(User.verification_token == token)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Invalid or expired verification token")

    user.email_verified = True
    user.verification_token = None
    await db.commit()

    return {"message": "Email verified successfully! You can now log in."}


@router.post("/resend-verification")
async def resend_verification(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resend verification email."""
    if not current_user.email:
        raise HTTPException(status_code=400, detail="No email address on file")
    if current_user.email_verified:
        return {"message": "Email already verified"}

    # Generate new token
    new_token = str(uuid.uuid4())
    current_user.verification_token = new_token
    await db.commit()

    await send_verification_email(current_user.email, new_token)
    return {"message": "Verification email sent!"}

"""QuestKids FastAPI application entry point."""

import os
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .core.config import settings
from .core.database import create_tables, async_session, engine
from .models import User, Family, TaskTemplate, TaskInstance, Reward, RewardRedemption, StreakHistory, Achievement, ChildAchievement, FamilyGoal, FamilyGoalProgress, Cheer, PowerUp, PowerUpPurchase, Organization, OrganizationMember, ApiKey, SeasonalEvent, HomeworkAssignment, Notification, AvatarItem, ChildAvatarItem  # noqa: F401
from .models import SoundSettings, DailyRitual, FamilyMessage, TaskSuggestion  # noqa: F401
from .api import auth, tasks, rewards, leaderboard, achievements, family_goals, cheers, recap, powerups, settings as settings_api
from .api import organizations, templates_marketplace, integrations, external, school, calendar, events, notifications, admin_metrics
from .api import tier1, avatars, allowance
from .api import sound, rituals, family_messages, suggestions, analytics

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and seed data on startup."""
    await create_tables()

    # Seed power-ups
    from .services.powerups import seed_powerups
    from .services.achievements import seed_achievements
    from .scripts.seed_events import seed_seasonal_events
    from .services.avatars import seed_avatar_items
    async with async_session() as db:
        await seed_powerups(db)
        await seed_achievements(db)
        await seed_seasonal_events(db)
        await seed_avatar_items(db)

    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="0.8.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Request ID middleware — adds X-Request-ID to all responses for tracing
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

app.add_middleware(RequestIDMiddleware)


# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)


# CSRF protection for auth endpoints
CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


class CSRFTokenMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip CSRF for safe methods
        if request.method in CSRF_SAFE_METHODS:
            return await call_next(request)

        # For state-changing requests on auth endpoints, validate origin/referrer
        if "/auth/" in request.url.path and request.method not in CSRF_SAFE_METHODS:
            origin = request.headers.get("origin", "")
            referer = request.headers.get("referer", "")
            allowed = any(
                o in origin or o in referer
                for o in settings.CORS_ORIGINS
            )
            # In development mode, allow requests without origin (API clients)
            if not origin and not referer:
                # Allow API client calls (fetch/curl without Origin header)
                pass
            elif not allowed and origin:
                return Response(
                    content='{"detail":"Invalid origin"}',
                    status_code=403,
                    media_type="application/json",
                )

        return await call_next(request)

app.add_middleware(CSRFTokenMiddleware)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(rewards.router, prefix="/api/v1")
app.include_router(leaderboard.router, prefix="/api/v1")
app.include_router(achievements.router, prefix="/api/v1")
app.include_router(family_goals.router, prefix="/api/v1")
app.include_router(cheers.router, prefix="/api/v1")
app.include_router(recap.router, prefix="/api/v1")
app.include_router(powerups.router, prefix="/api/v1")
app.include_router(settings_api.router, prefix="/api/v1")

# Phase 5 routes
app.include_router(organizations.router, prefix="/api/v1")
app.include_router(templates_marketplace.router, prefix="/api/v1")
app.include_router(integrations.router, prefix="/api/v1")
app.include_router(external.router)  # has its own /api/v1 prefix
app.include_router(school.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")

# Phase 6 routes
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(admin_metrics.router, prefix="/api/v1")

# Phase 7 routes
app.include_router(tier1.router, prefix="/api/v1")
app.include_router(avatars.router, prefix="/api/v1")
app.include_router(allowance.router, prefix="/api/v1")

# Phase 8 routes
app.include_router(sound.router, prefix="/api/v1")
app.include_router(rituals.router, prefix="/api/v1")
app.include_router(family_messages.router, prefix="/api/v1")
app.include_router(suggestions.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health_check():
    """Health check with DB connectivity test."""
    db_ok = False
    try:
        async with async_session() as db:
            await db.execute(User.__table__.select().limit(1))
            db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "ok" if db_ok else "degraded",
        "version": "0.8.0",
        "database": "connected" if db_ok else "disconnected",
    }


@app.get("/api/v1/health/detailed")
async def health_detailed():
    """Detailed health check with metrics."""
    # DB latency
    db_ok = False
    db_latency_ms = None
    try:
        start = time.monotonic()
        async with async_session() as db:
            await db.execute(User.__table__.select().limit(1))
        db_latency_ms = round((time.monotonic() - start) * 1000, 2)
        db_ok = True
    except Exception:
        pass

    # Disk space
    disk_free = None
    try:
        stat = os.statvfs("/app" if os.path.exists("/app") else ".")
        disk_free = round(stat.f_bavail * stat.f_frsize / (1024 * 1024 * 1024), 2)  # GB
    except Exception:
        pass

    # Uptime (since app started)
    uptime_seconds = round(time.monotonic())

    return {
        "status": "ok" if db_ok else "degraded",
        "version": "0.8.0",
        "database": {
            "connected": db_ok,
            "latency_ms": db_latency_ms,
        },
        "disk": {
            "free_gb": disk_free,
        },
        "uptime_seconds": uptime_seconds,
    }

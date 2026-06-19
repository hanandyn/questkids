"""QuestKids FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import create_tables, async_session
from .models import User, Family, TaskTemplate, TaskInstance, Reward, RewardRedemption, StreakHistory, Achievement, ChildAchievement, FamilyGoal, FamilyGoalProgress, Cheer, PowerUp, PowerUpPurchase, Organization, OrganizationMember, ApiKey, SeasonalEvent, HomeworkAssignment  # noqa: F401
from .api import auth, tasks, rewards, leaderboard, achievements, family_goals, cheers, recap, powerups, settings as settings_api
from .api import organizations, templates_marketplace, integrations, external, school, calendar, events


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and seed data on startup."""
    await create_tables()

    # Seed power-ups
    from .services.powerups import seed_powerups
    from .services.achievements import seed_achievements
    from .scripts.seed_events import seed_seasonal_events
    async with async_session() as db:
        await seed_powerups(db)
        await seed_achievements(db)
        await seed_seasonal_events(db)

    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="0.5.0",
    lifespan=lifespan,
)

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
        "version": "0.5.0",
        "database": "connected" if db_ok else "disconnected",
    }

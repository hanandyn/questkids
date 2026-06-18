"""QuestKids FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import create_tables
from .models import User, Family, TaskTemplate, TaskInstance, Reward, RewardRedemption, StreakHistory, Achievement, ChildAchievement, FamilyGoal, FamilyGoalProgress, Cheer  # noqa: F401
from .api import auth, tasks, rewards, leaderboard, achievements, family_goals, cheers, recap


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup."""
    await create_tables()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="0.2.0",
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


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "version": "0.2.0"}

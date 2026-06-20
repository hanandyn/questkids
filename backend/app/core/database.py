"""Database engine and session management."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from .config import settings


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrations: add columns to existing tables
        await _run_migrations(conn)


async def _run_migrations(conn):
    """Add new columns to existing tables (SQLite-compatible)."""
    from sqlalchemy import text, inspect

    def _get_columns(sync_conn):
        insp = inspect(sync_conn)
        return {c['name'] for c in insp.get_columns('task_templates')}

    existing = await conn.run_sync(_get_columns)

    if 'assigned_kids' not in existing:
        await conn.execute(text(
            'ALTER TABLE task_templates ADD COLUMN assigned_kids JSON'
        ))

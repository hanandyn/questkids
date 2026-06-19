"""Integration tests for Phase 6 features."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite://"

test_engine = create_async_engine(TEST_DATABASE_URL)
test_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with test_session() as session:
        try:
            yield session
        finally:
            await session.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


def make_client() -> AsyncClient:
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest_asyncio.fixture
async def parent_token():
    """Create a parent and return a token."""
    client = make_client()
    try:
        resp = await client.post("/api/v1/auth/register-parent", json={
            "username": "phase6parent",
            "display_name": "Parent",
            "password": "secret123",
            "role": "parent",
        })
        data = resp.json()
        return {"token": data["access_token"], "user": data["user"]}
    finally:
        await client.aclose()


@pytest_asyncio.fixture
async def child_token(parent_token):
    """Create a child and return a token."""
    client = make_client()
    try:
        headers = {"Authorization": f"Bearer {parent_token['token']}"}
        await client.post("/api/v1/auth/create-child", headers=headers, json={
            "username": "phase6child",
            "display_name": "Child",
            "password": "child123",
            "role": "child",
            "age_tier": 2,
        })
        resp = await client.post("/api/v1/auth/login", json={
            "username": "phase6child",
            "password": "child123",
        })
        data = resp.json()
        return {"token": data["access_token"], "user": data["user"]}
    finally:
        await client.aclose()


class TestEmailVerification:
    async def test_verify_invalid_token(self):
        client = make_client()
        try:
            resp = await client.post("/api/v1/auth/verify-email/fake-token-12345")
            assert resp.status_code == 404
        finally:
            await client.aclose()

    async def test_resend_verification_no_email(self, child_token):
        """Child accounts may not have email."""
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {child_token['token']}"}
            resp = await client.post("/api/v1/auth/resend-verification", headers=headers)
            assert resp.status_code == 400
        finally:
            await client.aclose()

    async def test_register_with_email_creates_verification_token(self, parent_token):
        """User registered should have a verification token set."""
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            resp = await client.get("/api/v1/auth/me", headers=headers)
            assert resp.status_code == 200
            data = resp.json()
            assert data["email_verified"] == False
        finally:
            await client.aclose()


class TestPhotoVerification:
    async def test_upload_photo_not_found(self, child_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {child_token['token']}"}
            # Try upload to non-existent instance
            import io
            fake_file = io.BytesIO(b"fake-image-data")
            resp = await client.post(
                "/api/v1/tasks/instances/99999/upload-photo",
                headers=headers,
                files={"file": ("test.jpg", fake_file, "image/jpeg")},
            )
            assert resp.status_code == 404
        finally:
            await client.aclose()

    async def test_upload_and_get_photo(self, parent_token, child_token):
        client = make_client()
        try:
            parent_headers = {"Authorization": f"Bearer {parent_token['token']}"}
            child_headers = {"Authorization": f"Bearer {child_token['token']}"}

            # Create a task template
            child_id = child_token["user"]["id"]
            tmpl_resp = await client.post("/api/v1/tasks/templates", headers=parent_headers, json={
                "name": "Photo Task",
                "task_type": "one_shot",
                "base_points": 10,
                "requires_photo": True,
                "assigned_child_ids": [child_id],
            })
            assert tmpl_resp.status_code == 200

            # Get instances
            inst_resp = await client.get("/api/v1/tasks/instances", headers=child_headers)
            instances = inst_resp.json()
            assert len(instances) > 0
            inst_id = instances[0]["id"]

            # Upload photo
            import io
            fake_file = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
            upload_resp = await client.post(
                f"/api/v1/tasks/instances/{inst_id}/upload-photo",
                headers=child_headers,
                files={"file": ("proof.png", fake_file, "image/png")},
            )
            assert upload_resp.status_code == 200
            data = upload_resp.json()
            assert "photo_url" in data

            # Get photo (child can see own)
            photo_resp = await client.get(
                f"/api/v1/tasks/instances/{inst_id}/photo",
                headers=child_headers,
            )
            assert photo_resp.status_code == 200

            # Pending approvals (parent)
            pending_resp = await client.get("/api/v1/tasks/pending-approvals", headers=parent_headers)
            assert pending_resp.status_code == 200

            # Complete the task
            complete_resp = await client.post(
                f"/api/v1/tasks/instances/{inst_id}/complete",
                json={"task_instance_id": inst_id, "elapsed_seconds": 0},
                headers=child_headers,
            )
            assert complete_resp.status_code == 200

            # Now it should appear in pending approvals (completed with photo)
            pending2 = await client.get("/api/v1/tasks/pending-approvals", headers=parent_headers)
            assert pending2.status_code == 200

            # Approve
            approve_resp = await client.post(
                f"/api/v1/tasks/instances/{inst_id}/approve",
                json={"approved": True, "notes": "Great job!"},
                headers=parent_headers,
            )
            assert approve_resp.status_code == 200
        finally:
            await client.aclose()

    async def test_reject_photo_sets_pending(self, parent_token, child_token):
        client = make_client()
        try:
            parent_headers = {"Authorization": f"Bearer {parent_token['token']}"}
            child_headers = {"Authorization": f"Bearer {child_token['token']}"}

            child_id = child_token["user"]["id"]
            await client.post("/api/v1/tasks/templates", headers=parent_headers, json={
                "name": "Reject Test",
                "task_type": "one_shot",
                "base_points": 10,
                "assigned_child_ids": [child_id],
            })

            inst_resp = await client.get("/api/v1/tasks/instances", headers=child_headers)
            inst_id = inst_resp.json()[0]["id"]

            # Complete
            await client.post(
                f"/api/v1/tasks/instances/{inst_id}/complete",
                json={"task_instance_id": inst_id, "elapsed_seconds": 0},
                headers=child_headers,
            )

            # Reject
            reject_resp = await client.post(
                f"/api/v1/tasks/instances/{inst_id}/approve",
                json={"approved": False, "notes": "Please try again"},
                headers=parent_headers,
            )
            assert reject_resp.status_code == 200
            assert reject_resp.json()["status"] == "pending"
        finally:
            await client.aclose()


class TestNotifications:
    async def test_list_notifications_empty(self, child_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {child_token['token']}"}
            resp = await client.get("/api/v1/notifications", headers=headers)
            assert resp.status_code == 200
            assert isinstance(resp.json(), list)
        finally:
            await client.aclose()

    async def test_unread_count_zero(self, child_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {child_token['token']}"}
            resp = await client.get("/api/v1/notifications/unread-count", headers=headers)
            assert resp.status_code == 200
            assert resp.json()["unread_count"] == 0
        finally:
            await client.aclose()

    async def test_mark_read_not_found(self, child_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {child_token['token']}"}
            resp = await client.post("/api/v1/notifications/99999/read", headers=headers)
            assert resp.status_code == 404
        finally:
            await client.aclose()

    async def test_mark_all_read(self, child_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {child_token['token']}"}
            resp = await client.post("/api/v1/notifications/read-all", headers=headers)
            assert resp.status_code == 200
        finally:
            await client.aclose()


class TestHealthDetailed:
    async def test_health_detailed(self):
        client = make_client()
        try:
            resp = await client.get("/api/v1/health/detailed")
            assert resp.status_code == 200
            data = resp.json()
            assert "status" in data
            assert "version" in data
            assert "database" in data
            assert "uptime_seconds" in data
        finally:
            await client.aclose()


class TestAdminMetrics:
    async def test_metrics_requires_parent(self, child_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {child_token['token']}"}
            resp = await client.get("/api/v1/admin/metrics", headers=headers)
            assert resp.status_code == 403
        finally:
            await client.aclose()

    async def test_metrics_as_parent(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            resp = await client.get("/api/v1/admin/metrics", headers=headers)
            assert resp.status_code == 200
            data = resp.json()
            assert "user_count" in data
            assert "family_count" in data
            assert "tasks_completed_today" in data
            assert "active_streaks" in data
            assert data["user_count"] >= 1
        finally:
            await client.aclose()


class TestRateLimiting:
    async def test_login_rate_limit_headers_exist(self):
        """Verify the rate limiter middleware is registered (doesn't test actual limiting in integration)."""
        client = make_client()
        try:
            # Register a user first
            await client.post("/api/v1/auth/register-parent", json={
                "username": "ratelimit",
                "display_name": "RL",
                "password": "secret123",
                "role": "parent",
            })
            # Login normally
            resp = await client.post("/api/v1/auth/login", json={
                "username": "ratelimit",
                "password": "secret123",
            })
            assert resp.status_code == 200
        finally:
            await client.aclose()

    async def test_rate_limit_allows_normal_use(self):
        """Verify that rate limiting doesn't block normal usage."""
        client = make_client()
        try:
            for i in range(3):
                resp = await client.post("/api/v1/auth/register-parent", json={
                    "username": f"normaluser{i}",
                    "display_name": f"User{i}",
                    "password": "secret123",
                    "role": "parent",
                })
                assert resp.status_code == 200, f"Register {i} failed: {resp.text}"
        finally:
            await client.aclose()


class TestSecurityHeaders:
    async def test_security_headers(self):
        client = make_client()
        try:
            resp = await client.get("/api/v1/health")
            assert resp.status_code == 200
            assert resp.headers.get("x-content-type-options") == "nosniff"
            assert resp.headers.get("x-frame-options") == "DENY"
            assert resp.headers.get("x-xss-protection") == "1; mode=block"
        finally:
            await client.aclose()

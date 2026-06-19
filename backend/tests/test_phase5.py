"""Integration tests for Phase 5 features."""

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
            "username": "phase5parent",
            "display_name": "Parent",
            "password": "Secret123",
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
            "username": "phase5child",
            "display_name": "Child",
            "password": "Child123",
            "role": "child",
            "age_tier": 2,
        })
        # Login as child
        resp = await client.post("/api/v1/auth/login", json={
            "username": "phase5child",
            "password": "Child123",
        })
        data = resp.json()
        return {"token": data["access_token"], "user": data["user"]}
    finally:
        await client.aclose()


class TestOrganizations:
    async def test_create_organization(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            resp = await client.post("/api/v1/organizations", headers=headers, json={
                "name": "Test School",
                "type": "school",
            })
            assert resp.status_code == 200
            data = resp.json()
            assert data["name"] == "Test School"
            assert data["code"] != ""
            assert len(data["code"]) == 8
        finally:
            await client.aclose()

    async def test_join_organization(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            # Create org
            create_resp = await client.post("/api/v1/organizations", headers=headers, json={
                "name": "Join Test",
                "type": "classroom",
            })
            code = create_resp.json()["code"]

            # Create second parent to join
            resp2 = await client.post("/api/v1/auth/register-parent", json={
                "username": "joiner",
                "display_name": "Joiner",
                "password": "Secret123",
                "role": "parent",
            })
            token2 = resp2.json()["access_token"]
            headers2 = {"Authorization": f"Bearer {token2}"}

            join_resp = await client.post("/api/v1/organizations/join", headers=headers2, json={
                "code": code,
            })
            assert join_resp.status_code == 200
        finally:
            await client.aclose()

    async def test_get_my_orgs(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            await client.post("/api/v1/organizations", headers=headers, json={
                "name": "My Org", "type": "school",
            })
            resp = await client.get("/api/v1/organizations/my", headers=headers)
            assert resp.status_code == 200
            orgs = resp.json()
            assert len(orgs) == 1
            assert orgs[0]["member_count"] >= 1
        finally:
            await client.aclose()

    async def test_leave_organization(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            create_resp = await client.post("/api/v1/organizations", headers=headers, json={
                "name": "Leave Test", "type": "scouts",
            })
            org_id = create_resp.json()["id"]

            leave_resp = await client.delete(f"/api/v1/organizations/{org_id}", headers=headers)
            assert leave_resp.status_code == 200

            # Should no longer appear
            resp = await client.get("/api/v1/organizations/my", headers=headers)
            assert len(resp.json()) == 0
        finally:
            await client.aclose()


class TestTemplateMarketplace:
    async def test_browse_marketplace(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            resp = await client.get("/api/v1/templates/marketplace", headers=headers)
            assert resp.status_code == 200
            assert isinstance(resp.json(), list)
        finally:
            await client.aclose()

    async def test_marketplace_categories(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            resp = await client.get("/api/v1/templates/marketplace/categories", headers=headers)
            assert resp.status_code == 200
        finally:
            await client.aclose()

    async def test_rate_template_not_found(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            resp = await client.post("/api/v1/templates/99999/rate", headers=headers, json={
                "rating": 5,
            })
            assert resp.status_code == 404
        finally:
            await client.aclose()


class TestIntegrations:
    async def test_create_and_list_api_key(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            resp = await client.post("/api/v1/integrations/keys", headers=headers, json={
                "name": "Test Key",
                "scopes": ["read:tasks", "write:tasks"],
            })
            assert resp.status_code == 200
            data = resp.json()
            assert "key" in data
            assert data["scopes"] == ["read:tasks", "write:tasks"]

            # List keys
            resp2 = await client.get("/api/v1/integrations/keys", headers=headers)
            assert resp2.status_code == 200
            keys = resp2.json()
            assert len(keys) == 1
            # Key itself should NOT be in the list response
            assert "key" not in keys[0]
        finally:
            await client.aclose()

    async def test_revoke_api_key(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            resp = await client.post("/api/v1/integrations/keys", headers=headers, json={
                "name": "Revoke Key", "scopes": ["read:tasks"],
            })
            key_id = resp.json()["id"]

            revoke = await client.delete(f"/api/v1/integrations/keys/{key_id}", headers=headers)
            assert revoke.status_code == 200

            # Should not appear in list
            resp2 = await client.get("/api/v1/integrations/keys", headers=headers)
            assert len(resp2.json()) == 0
        finally:
            await client.aclose()

    async def test_invalid_scope(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            resp = await client.post("/api/v1/integrations/keys", headers=headers, json={
                "name": "Bad Key", "scopes": ["invalid:scope"],
            })
            assert resp.status_code == 422
        finally:
            await client.aclose()


class TestSchool:
    async def test_create_assignment(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            # Create org first (auto-joins as admin)
            org_resp = await client.post("/api/v1/organizations", headers=headers, json={
                "name": "School", "type": "school",
            })
            assert org_resp.status_code == 200

            # Create a child
            child_resp = await client.post("/api/v1/auth/create-child", headers=headers, json={
                "username": "student1", "display_name": "Student", "password": "Pass123",
                "role": "child", "age_tier": 3,
            })
            child_id = child_resp.json()["id"]

            # Assign homework
            resp = await client.post("/api/v1/school/assignments", headers=headers, json={
                "child_id": child_id,
                "title": "Math Homework",
                "subject": "Math",
                "points": 25,
            })
            assert resp.status_code == 200
            assert resp.json()["title"] == "Math Homework"
            assert resp.json()["status"] == "assigned"
        finally:
            await client.aclose()

    async def test_get_assignments(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            resp = await client.get("/api/v1/school/assignments", headers=headers)
            assert resp.status_code == 200
        finally:
            await client.aclose()

    async def test_complete_assignment(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            # Setup org
            await client.post("/api/v1/organizations", headers=headers, json={
                "name": "School2", "type": "school",
            })
            child_resp = await client.post("/api/v1/auth/create-child", headers=headers, json={
                "username": "student2", "display_name": "Student2", "password": "Pass123",
                "role": "child", "age_tier": 3,
            })
            child_id = child_resp.json()["id"]

            # Assign
            assign_resp = await client.post("/api/v1/school/assignments", headers=headers, json={
                "child_id": child_id,
                "title": "Complete Me",
                "points": 15,
            })
            assign_id = assign_resp.json()["id"]

            # Login as child
            child_login = await client.post("/api/v1/auth/login", json={
                "username": "student2", "password": "Pass123",
            })
            child_headers = {"Authorization": f"Bearer {child_login.json()['access_token']}"}

            # Complete
            complete_resp = await client.post(
                f"/api/v1/school/assignments/{assign_id}/complete",
                headers=child_headers,
                json={"completed": True},
            )
            assert complete_resp.status_code == 200
            assert complete_resp.json()["status"] == "completed"
        finally:
            await client.aclose()


class TestCalendar:
    async def test_calendar_feed(self, child_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {child_token['token']}"}
            child_id = child_token["user"]["id"]
            resp = await client.get(f"/api/v1/calendar/{child_id}/feed.ics", headers=headers)
            assert resp.status_code == 200
            content = resp.text
            assert "BEGIN:VCALENDAR" in content
            assert "END:VCALENDAR" in content
            assert "QuestKids" in content
        finally:
            await client.aclose()


class TestSeasonalEvents:
    async def test_get_active_events(self, child_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {child_token['token']}"}
            resp = await client.get("/api/v1/events/active", headers=headers)
            assert resp.status_code == 200
            data = resp.json()
            assert "events" in data
            assert isinstance(data["events"], list)
            assert "has_active" in data
        finally:
            await client.aclose()


class TestExternalAPI:
    async def test_external_tasks_requires_key(self):
        client = make_client()
        try:
            resp = await client.get("/api/v1/external/tasks")
            assert resp.status_code == 401
        finally:
            await client.aclose()

    async def test_external_tasks_with_key(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            # Create API key
            key_resp = await client.post("/api/v1/integrations/keys", headers=headers, json={
                "name": "External Key", "scopes": ["read:tasks"],
            })
            api_key = key_resp.json()["key"]

            ext_headers = {"x-api-key": api_key}
            resp = await client.get("/api/v1/external/tasks", headers=ext_headers)
            assert resp.status_code == 200
        finally:
            await client.aclose()

    async def test_external_children_with_key(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            key_resp = await client.post("/api/v1/integrations/keys", headers=headers, json={
                "name": "Children Key", "scopes": ["read:children"],
            })
            api_key = key_resp.json()["key"]

            ext_headers = {"x-api-key": api_key}
            resp = await client.get("/api/v1/external/children", headers=ext_headers)
            assert resp.status_code == 200
        finally:
            await client.aclose()

    async def test_external_insufficient_scope(self, parent_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {parent_token['token']}"}
            key_resp = await client.post("/api/v1/integrations/keys", headers=headers, json={
                "name": "Limited Key", "scopes": ["read:tasks"],
            })
            api_key = key_resp.json()["key"]

            ext_headers = {"x-api-key": api_key}
            resp = await client.get("/api/v1/external/children", headers=ext_headers)
            assert resp.status_code == 403
        finally:
            await client.aclose()


class TestParentOrgRequired:
    async def test_org_endpoints_require_parent(self, child_token):
        client = make_client()
        try:
            headers = {"Authorization": f"Bearer {child_token['token']}"}
            resp = await client.get("/api/v1/organizations/my", headers=headers)
            assert resp.status_code == 403
        finally:
            await client.aclose()


class TestHealthCheck:
    async def test_health_check(self):
        client = make_client()
        try:
            resp = await client.get("/api/v1/health")
            assert resp.status_code == 200
            data = resp.json()
            assert data["version"] == "0.8.0"
            assert "database" in data
        finally:
            await client.aclose()

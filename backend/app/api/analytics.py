"""Analytics API — advanced insights, trends, and exports."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from io import StringIO

from ..core.database import get_db
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User
from ..services.analytics import get_child_trends, get_family_csv, generate_pdf_report

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/child/{child_id}/trends")
async def child_trends(
    child_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = 30,
):
    """Get completion trends for a specific child."""
    if current_user.role != "parent" and current_user.id != child_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Verify child is in the same family
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == child_id))
    child = result.scalar_one_or_none()
    if not child or child.family_id != current_user.family_id:
        raise HTTPException(status_code=404, detail="Child not found or not in your family")

    return await get_child_trends(db, child_id, days=min(days, 365))


@router.get("/child/{child_id}/export/pdf")
async def child_export_pdf(
    child_id: int,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Generate a PDF-like HTML report for a child."""
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == child_id))
    child = result.scalar_one_or_none()
    if not child or child.family_id != current_user.family_id:
        raise HTTPException(status_code=404, detail="Child not found")

    html = await generate_pdf_report(db, child_id)
    return HTMLResponse(content=html.decode("utf-8"), media_type="text/html")


@router.get("/family/export/csv")
async def family_export_csv(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Export all family task data as CSV."""
    if current_user.family_id is None:
        raise HTTPException(status_code=400, detail="No family associated")

    csv_data = await get_family_csv(db, current_user.family_id)
    return StreamingResponse(
        StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=questkids_tasks.csv"},
    )

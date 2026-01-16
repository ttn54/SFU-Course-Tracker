"""
Seat Watcher API routes.
"""
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import Watcher, WatcherCreate, WatcherRead, Section
from services.worker import get_worker

router = APIRouter(prefix="/watchers", tags=["watchers"])


@router.post("", response_model=WatcherRead, status_code=201)
async def create_watcher(
    watcher_data: WatcherCreate,
    session: Session = Depends(get_session)
) -> Watcher:
    """
    Create a new seat availability watcher.
    
    Example:
    ```json
    POST /api/v1/watchers
    {
        "email": "student@sfu.ca",
        "section_id": 123
    }
    ```
    
    The background worker will check this section every 10 minutes
    and alert the user when seats become available.
    """
    # Verify section exists
    section = session.get(Section, watcher_data.section_id)
    if not section:
        raise HTTPException(
            status_code=404,
            detail=f"Section {watcher_data.section_id} not found"
        )
    
    # Check if watcher already exists
    statement = select(Watcher).where(
        Watcher.user_email == watcher_data.email,
        Watcher.section_id == watcher_data.section_id,
        Watcher.is_active == True
    )
    existing = session.exec(statement).first()
    
    if existing:
        return existing
    
    # Create new watcher
    watcher = Watcher(
        user_email=watcher_data.email,
        section_id=watcher_data.section_id,
        is_active=True
    )
    
    session.add(watcher)
    session.commit()
    session.refresh(watcher)
    
    return watcher


@router.get("", response_model=list[WatcherRead])
async def get_user_watchers(
    email: str,
    session: Session = Depends(get_session)
) -> list[Watcher]:
    """
    Get all watchers for a user.
    
    Example: GET /api/v1/watchers?email=student@sfu.ca
    """
    statement = select(Watcher).where(
        Watcher.user_email == email,
        Watcher.is_active == True
    )
    watchers = session.exec(statement).all()
    
    return watchers


@router.delete("/{watcher_id}", status_code=204)
async def delete_watcher(
    watcher_id: int,
    session: Session = Depends(get_session)
) -> None:
    """
    Delete (deactivate) a watcher.
    
    Example: DELETE /api/v1/watchers/123
    """
    watcher = session.get(Watcher, watcher_id)
    
    if not watcher:
        raise HTTPException(status_code=404, detail=f"Watcher {watcher_id} not found")
    
    watcher.is_active = False
    session.add(watcher)
    session.commit()


@router.post("/{watcher_id}/reactivate", response_model=WatcherRead)
async def reactivate_watcher(
    watcher_id: int,
    session: Session = Depends(get_session)
) -> Watcher:
    """
    Reactivate a previously deactivated watcher.
    
    Example: POST /api/v1/watchers/123/reactivate
    """
    watcher = session.get(Watcher, watcher_id)
    
    if not watcher:
        raise HTTPException(status_code=404, detail=f"Watcher {watcher_id} not found")
    
    watcher.is_active = True
    session.add(watcher)
    session.commit()
    session.refresh(watcher)
    
    return watcher


@router.post("/check/{section_id}", response_model=dict[str, Any])
async def manual_check_section(
    section_id: int,
    session: Session = Depends(get_session)
) -> dict[str, Any]:
    """
    Manually trigger a seat check for a specific section.
    Useful for testing the watcher system.
    
    Example: POST /api/v1/watchers/check/123
    """
    # Verify section exists
    section = session.get(Section, section_id)
    if not section:
        raise HTTPException(
            status_code=404,
            detail=f"Section {section_id} not found"
        )
    
    # Trigger the check
    worker = get_worker()
    result = await worker.check_specific_section(section_id)
    
    return result


@router.get("/stats", response_model=dict[str, Any])
async def get_watcher_stats(
    session: Session = Depends(get_session)
) -> dict[str, Any]:
    """
    Get statistics about the watcher system.
    
    Example: GET /api/v1/watchers/stats
    """
    # Count active watchers
    statement = select(Watcher).where(Watcher.is_active == True)
    active_watchers = session.exec(statement).all()
    
    # Group by section
    sections_watched = len(set(w.section_id for w in active_watchers))
    
    # Group by user
    unique_users = len(set(w.user_email for w in active_watchers))
    
    return {
        "total_active_watchers": len(active_watchers),
        "unique_sections_watched": sections_watched,
        "unique_users": unique_users
    }

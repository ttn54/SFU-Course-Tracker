"""
User API routes.
Handles user profile and course completion tracking.
"""
from typing import Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from database import get_session
from models import User
from routers.auth import get_current_user_id

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me")
async def get_current_user(
    user_id: int = Depends(get_current_user_id),
    session: Session = Depends(get_session)
) -> dict[str, Any]:
    """
    Get current user profile.
    
    Requires Authorization header with Bearer token.
    """
    user = session.get(User, user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "email": user.email,
        "completedCourses": user.completed_courses,
        "scheduledCourses": user.scheduled_courses,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "updatedAt": user.updated_at.isoformat() if user.updated_at else None
    }


@router.put("/schedule")
async def update_schedule(
    schedule: dict[str, Any],
    user_id: int = Depends(get_current_user_id),
    session: Session = Depends(get_session)
) -> dict[str, Any]:
    """
    Save user's course schedule.
    
    Example:
    ```json
    PUT /api/v1/user/schedule
    Authorization: Bearer <token>
    {
        "courseGroups": [...]
    }
    ```
    """
    user = session.get(User, user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.scheduled_courses = schedule
    user.updated_at = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return {
        "message": "Schedule saved successfully",
        "scheduledCourses": user.scheduled_courses
    }


@router.get("/schedule")
async def get_schedule(
    user_id: int = Depends(get_current_user_id),
    session: Session = Depends(get_session)
) -> dict[str, Any]:
    """
    Get user's saved course schedule.
    
    Requires Authorization header with Bearer token.
    """
    user = session.get(User, user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "scheduledCourses": user.scheduled_courses or {}
    }


@router.put("/courses")
async def update_completed_courses(
    completed_courses: list[str],
    user_id: int = Depends(get_current_user_id),
    session: Session = Depends(get_session)
) -> dict[str, Any]:
    """
    Update user's completed courses.
    
    Example:
    ```json
    PUT /api/user/courses
    Authorization: Bearer <token>
    {
        "completedCourses": ["CMPT 120", "CMPT 125", "MACM 101"]
    }
    ```
    """
    user = session.get(User, user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.completed_courses = completed_courses
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return {
        "message": "Completed courses updated successfully",
        "completedCourses": user.completed_courses
    }

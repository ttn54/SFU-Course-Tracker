"""
Prerequisite Validation API routes.
"""
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session

from database import get_session
from models import PrerequisiteValidationRequest, PrerequisiteValidationResponse
from services.validator import PrerequisiteValidator

router = APIRouter(prefix="/validate", tags=["validation"])


@router.post("/prereqs", response_model=PrerequisiteValidationResponse)
async def validate_prerequisites(
    request: PrerequisiteValidationRequest,
    session: Session = Depends(get_session)
) -> PrerequisiteValidationResponse:
    """
    Validate if a student can take a course based on their transcript.
    
    Example:
    ```json
    POST /api/v1/validate/prereqs
    {
        "target_course": "CMPT-300",
        "transcript": ["CMPT-120", "CMPT-125", "MACM-101"]
    }
    ```
    
    Response:
    ```json
    {
        "target_course": "CMPT-300",
        "is_valid": true,
        "missing_courses": [],
        "prerequisite_tree": {...},
        "message": "You meet all prerequisites for CMPT-300"
    }
    ```
    """
    validator = PrerequisiteValidator(session)
    
    result = validator.validate_prerequisites(
        target_course=request.target_course,
        transcript=request.transcript
    )
    
    return PrerequisiteValidationResponse(
        target_course=result["target_course"],
        is_valid=result["is_valid"],
        missing_courses=result["missing_courses"],
        prerequisite_tree=result.get("prerequisite_tree"),
        message=result["message"]
    )


@router.get("/prereq-chain/{course_id}", response_model=list[str])
async def get_prerequisite_chain(
    course_id: str,
    session: Session = Depends(get_session)
) -> list[str]:
    """
    Get the full chain of prerequisites for a course.
    
    Example: GET /api/v1/validate/prereq-chain/CMPT-300
    
    Returns: ["CMPT-120", "CMPT-125", "MACM-101", ...]
    """
    validator = PrerequisiteValidator(session)
    chain = validator.get_prerequisite_chain(course_id)
    
    return chain


@router.get("/unlocked-by/{course_id}", response_model=list[str])
async def get_courses_unlocked(
    course_id: str,
    session: Session = Depends(get_session)
) -> list[str]:
    """
    Get courses that become available after completing a course.
    
    Example: GET /api/v1/validate/unlocked-by/CMPT-120
    
    Returns: ["CMPT-225", "CMPT-276", ...]
    """
    validator = PrerequisiteValidator(session)
    unlocked = validator.get_courses_enabled_by(course_id)
    
    return unlocked


@router.post("/suggest-next", response_model=list[dict[str, Any]])
async def suggest_next_courses(
    body: dict[str, Any] = Body(...),
    session: Session = Depends(get_session)
) -> list[dict[str, Any]]:
    """
    Suggest courses a student can take next based on their transcript.
    
    Example:
    ```json
    POST /api/v1/validate/suggest-next
    {
        "transcript": ["CMPT-120", "CMPT-125", "MATH-150"],
        "limit": 50
    }
    ```
    
    Returns a list of courses the student is eligible for.
    """
    transcript = body.get("transcript", [])
    limit = body.get("limit", 50)
    
    validator = PrerequisiteValidator(session)
    suggestions = validator.suggest_next_courses(transcript, limit)
    
    return suggestions

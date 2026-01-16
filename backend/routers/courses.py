"""
Course API routes.
"""
from typing import Optional, Any
import json
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlmodel import Session, select, or_, and_

from database import get_session
from crawler.sfu_api_client import SFUAPIClient
from models import Course, Section, CourseRead, SectionRead, SectionWithCourse

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/all")
async def get_all_courses() -> list[dict[str, Any]]:
    """
    Get all available courses from the JSON file.
    This endpoint reads directly from fall_2025_courses_with_enrollment.json
    
    Example: GET /api/v1/courses/all
    
    Returns:
        List of all courses with their sections and enrollment data
    """
    json_path = Path(__file__).parent.parent / "data" / "fall_2025_courses_with_enrollment.json"
    
    if not json_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Course data file not found"
        )
    
    with open(json_path, 'r', encoding='utf-8') as f:
        courses = json.load(f)
    
    return courses


@router.get("/search", response_model=list[CourseRead])
async def search_courses(
    q: str = Query(..., min_length=1, description="Search query"),
    session: Session = Depends(get_session)
) -> list[Course]:
    """
    Search for courses by department, number, or title.
    
    Example: GET /api/v1/courses/search?q=CMPT
    """
    search_term = f"%{q.upper()}%"
    
    statement = select(Course).where(
        or_(
            Course.dept.like(search_term),
            Course.number.like(search_term),
            Course.title.like(search_term),
            Course.id.like(search_term)
        )
    ).limit(50)
    
    courses = session.exec(statement).all()
    
    return courses


@router.get("/{dept}/{number}", response_model=CourseRead)
async def get_course(
    dept: str,
    number: str,
    session: Session = Depends(get_session)
) -> Course:
    """
    Get detailed information about a specific course.
    
    Example: GET /api/v1/courses/CMPT/276
    """
    course_id = f"{dept.upper()}-{number}"
    
    statement = select(Course).where(Course.id == course_id)
    course = session.exec(statement).first()
    
    if not course:
        raise HTTPException(status_code=404, detail=f"Course {course_id} not found")
    
    return course


@router.get("/{dept}/{number}/sections", response_model=list[SectionRead])
async def get_course_sections(
    dept: str,
    number: str,
    term: Optional[str] = Query(None, description="Filter by term (e.g., 'Spring 2026')"),
    session: Session = Depends(get_session)
) -> list[dict[str, Any]]:
    """
    Get all sections for a specific course.
    
    Example: GET /api/v1/courses/CMPT/276/sections?term=Spring 2026
    """
    course_id = f"{dept.upper()}-{number}"
    
    # Build query
    conditions = [Section.course_id == course_id]
    if term:
        conditions.append(Section.term == term)
    
    statement = select(Section).where(and_(*conditions))
    sections = session.exec(statement).all()
    
    # Convert to response format with computed fields
    result = []
    for section in sections:
        section_dict = {
            "id": section.id,
            "course_id": section.course_id,
            "term": section.term,
            "section_code": section.section_code,
            "instructor": section.instructor,
            "schedule_json": section.schedule_json,
            "location": section.location,
            "delivery_method": section.delivery_method,
            "seats_total": section.seats_total,
            "seats_enrolled": section.seats_enrolled,
            "seats_available": section.seats_available,
            "waitlist_total": section.waitlist_total,
            "waitlist_enrolled": section.waitlist_enrolled
        }
        result.append(section_dict)
    
    return result


@router.get("/departments", response_model=list[str])
async def get_departments(
    session: Session = Depends(get_session)
) -> list[str]:
    """
    Get list of all departments.
    
    Example: GET /api/v1/courses/departments
    """
    statement = select(Course.dept).distinct()
    departments = session.exec(statement).all()
    
    return sorted(departments)


@router.get("/terms", response_model=list[str])
async def get_terms(
    session: Session = Depends(get_session)
) -> list[str]:
    """
    Get list of all available terms.
    
    Example: GET /api/v1/courses/terms
    """
    statement = select(Section.term).distinct()
    terms = session.exec(statement).all()
    
    return sorted(terms, reverse=True)


@router.get("/section/{section_id}", response_model=SectionRead)
async def get_section(
    section_id: int,
    session: Session = Depends(get_session)
) -> dict[str, Any]:
    """
    Get detailed information about a specific section.
    
    Example: GET /api/v1/courses/section/123
    """
    section = session.get(Section, section_id)
    
    if not section:
        raise HTTPException(status_code=404, detail=f"Section {section_id} not found")
    
    return {
        "id": section.id,
        "course_id": section.course_id,
        "term": section.term,
        "section_code": section.section_code,
        "instructor": section.instructor,
        "schedule_json": section.schedule_json,
        "location": section.location,
        "delivery_method": section.delivery_method,
        "seats_total": section.seats_total,
        "seats_enrolled": section.seats_enrolled,
        "seats_available": section.seats_available,
        "waitlist_total": section.waitlist_total,
        "waitlist_enrolled": section.waitlist_enrolled
    }


@router.get("/enrollment/{dept}/{number}/{section}")
async def get_live_enrollment(
    dept: str,
    number: str,
    section: str,
    term: Optional[str] = Query("2025/fall", description="Term in format YYYY/season")
) -> dict[str, Any]:
    """
    Fetch live enrollment data from CourSys in real-time.
    
    Example: GET /api/v1/courses/enrollment/CMPT/354/D100?term=2025/fall
    
    Returns:
        {
            "dept": "CMPT",
            "number": "354",
            "section": "D100",
            "enrolled": "150/150",
            "waitlist": "5",
            "timestamp": "2025-11-25T10:30:00"
        }
    """
    client = SFUAPIClient(rate_limit_delay=0.1)
    
    # Parse term format
    year, season = term.split('/')
    
    # Fetch enrollment data
    enrolled, waitlist = client.get_enrollment_data(year, season, dept.lower(), number.lower(), section)
    
    return {
        "dept": dept.upper(),
        "number": number,
        "section": section.upper(),
        "enrolled": enrolled or "N/A",
        "waitlist": waitlist or "0",
        "timestamp": datetime.utcnow().isoformat(),
        "term": term
    }


@router.post("/enrollment/batch")
async def get_batch_enrollment(
    courses: list[dict[str, str]] = Body(..., description="List of course sections"),
    term: Optional[str] = Query("2025/fall", description="Term in format YYYY/season")
) -> list[dict[str, Any]]:
    """
    Fetch live enrollment data for multiple courses at once.
    
    Example: POST /api/v1/courses/enrollment/batch?term=2025/fall
    Body: [
        {"dept": "CMPT", "number": "354", "section": "D100"},
        {"dept": "CMPT", "number": "120", "section": "D100"}
    ]
    
    Returns: List of enrollment data for each course
    """
    from crawler.sfu_api_client import SFUAPIClient
    from datetime import datetime
    import asyncio
    
    client = SFUAPIClient(rate_limit_delay=0.2)
    year, season = term.split('/')
    
    results = []
    
    # Fetch enrollment for each course
    for course in courses:
        dept = course.get('dept', '').lower()
        number = course.get('number', '').lower()
        section = course.get('section', '').upper()
        
        if not (dept and number and section):
            continue
        
        enrolled, waitlist = client.get_enrollment_data(year, season, dept, number, section)
        
        results.append({
            "dept": dept.upper(),
            "number": number,
            "section": section,
            "enrolled": enrolled or "N/A",
            "waitlist": waitlist or "0",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Small delay between requests
        await asyncio.sleep(0.2)
    
    return results

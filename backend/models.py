"""
Database models for the SFU Scheduler.
"""
from typing import Optional, Any
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship, Column, JSON


class Course(SQLModel, table=True):
    """Course table - Static information about courses."""
    
    __tablename__ = "courses"
    
    id: str = Field(primary_key=True, description="Course ID (e.g., 'CMPT-276')")
    dept: str = Field(index=True, description="Department code (e.g., 'CMPT')")
    number: str = Field(index=True, description="Course number (e.g., '276')")
    title: str = Field(description="Course title")
    description: Optional[str] = Field(default=None, description="Course description")
    credits: int = Field(default=3, description="Number of credits")
    prerequisites_raw: Optional[str] = Field(default=None, description="Raw prerequisite string from SFU")
    prerequisites_logic: Optional[dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Parsed boolean tree structure for prerequisites"
    )
    
    # Relationships
    sections: list["Section"] = Relationship(back_populates="course")
    
    def __repr__(self) -> str:
        return f"<Course {self.id}: {self.title}>"


class Section(SQLModel, table=True):
    """Section table - Dynamic information about course sections."""
    
    __tablename__ = "sections"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: str = Field(foreign_key="courses.id", index=True)
    term: str = Field(index=True, description="Term (e.g., 'Spring 2026')")
    section_code: str = Field(description="Section code (e.g., 'D100')")
    instructor: Optional[str] = Field(default=None, description="Instructor name")
    schedule_json: Optional[list[dict[str, Any]]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Schedule data: [{'day': 'Mon', 'start': '14:30', 'end': '15:20', 'type': 'Lecture'}]"
    )
    location: Optional[str] = Field(default=None, description="Campus location")
    delivery_method: Optional[str] = Field(default="In Person", description="Delivery method")
    
    # Seat tracking
    seats_total: int = Field(default=0, description="Total seats")
    seats_enrolled: int = Field(default=0, description="Currently enrolled")
    waitlist_total: int = Field(default=0, description="Waitlist capacity")
    waitlist_enrolled: int = Field(default=0, description="Currently on waitlist")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    course: Course = Relationship(back_populates="sections")
    watchers: list["Watcher"] = Relationship(back_populates="section")
    
    def __repr__(self) -> str:
        return f"<Section {self.course_id} {self.section_code} ({self.term})>"
    
    @property
    def seats_available(self) -> int:
        """Calculate available seats."""
        return max(0, self.seats_total - self.seats_enrolled)


class Watcher(SQLModel, table=True):
    """Watcher table - Seat availability alerts."""
    
    __tablename__ = "watchers"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_email: str = Field(index=True, description="User's email for notifications")
    section_id: int = Field(foreign_key="sections.id", index=True)
    is_active: bool = Field(default=True, description="Whether the watcher is active")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    section: Section = Relationship(back_populates="watchers")
    
    def __repr__(self) -> str:
        return f"<Watcher {self.user_email} for Section {self.section_id}>"


class User(SQLModel, table=True):
    """User table - For authentication and tracking completed courses."""
    
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, description="User email")
    password: str = Field(description="Hashed password")
    completed_courses: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="List of completed course codes"
    )
    scheduled_courses: Optional[dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Saved course schedule with all selections"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def __repr__(self) -> str:
        return f"<User {self.id}: {self.email}>"


# Pydantic models for API requests/responses

class CourseRead(SQLModel):
    """Response model for course data."""
    id: str
    dept: str
    number: str
    title: str
    description: Optional[str] = None
    credits: int
    prerequisites_raw: Optional[str] = None


class SectionRead(SQLModel):
    """Response model for section data."""
    id: int
    course_id: str
    term: str
    section_code: str
    instructor: Optional[str] = None
    schedule_json: Optional[list[dict[str, Any]]] = None
    location: Optional[str] = None
    delivery_method: Optional[str] = None
    seats_total: int
    seats_enrolled: int
    seats_available: int
    waitlist_total: int
    waitlist_enrolled: int


class SectionWithCourse(SectionRead):
    """Section with embedded course information."""
    course: CourseRead


class WatcherCreate(SQLModel):
    """Request model for creating a watcher."""
    email: str
    section_id: int


class WatcherRead(SQLModel):
    """Response model for watcher data."""
    id: int
    user_email: str
    section_id: int
    is_active: bool
    created_at: datetime


class PrerequisiteValidationRequest(SQLModel):
    """Request model for prerequisite validation."""
    target_course: str  # e.g., "CMPT-300" or "CMPT 300"
    transcript: list[str]  # e.g., ["CMPT-120", "CMPT-125", "MACM-101"]


class PrerequisiteValidationResponse(SQLModel):
    """Response model for prerequisite validation."""
    target_course: str
    is_valid: bool
    missing_courses: list[str]
    prerequisite_tree: Optional[dict[str, Any]] = None
    message: str

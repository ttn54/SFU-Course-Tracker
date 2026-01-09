"""Quick verification script to check seeded data."""
from sqlmodel import Session, create_engine, select
from models import Course, Section
from config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)

with Session(engine) as session:
    # Count records
    courses = session.exec(select(Course)).all()
    sections = session.exec(select(Section)).all()
    
    print(f"📊 Database Statistics:")
    print(f"   Courses: {len(courses)}")
    print(f"   Sections: {len(sections)}")
    
    # Show courses with prerequisites
    print(f"\n📋 Courses with Prerequisites:")
    courses_with_prereqs = session.exec(
        select(Course).where(Course.prerequisites_raw != None)
    ).all()
    
    for course in courses_with_prereqs[:5]:  # First 5
        print(f"   {course.id}: {course.title}")
        print(f"      Prerequisites: {course.prerequisites_raw[:100]}...")
    
    # Show a course with sections
    print(f"\n📖 Sample Course with Multiple Sections:")
    course_with_sections = session.exec(
        select(Course).where(Course.id == "CMPT-120")
    ).first()
    
    if course_with_sections:
        print(f"   {course_with_sections.id}: {course_with_sections.title}")
        print(f"   Sections: {len(course_with_sections.sections)}")
        for section in course_with_sections.sections:
            print(f"      - {section.section_code} ({section.instructor or 'TBA'})")
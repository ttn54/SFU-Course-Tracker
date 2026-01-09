"""
Seed the database with courses from fall_2025_courses.json
and fetch prerequisites from CourSys for each course.
"""
import json
import sys
import requests
import re
from pathlib import Path
from sqlmodel import Session, create_engine, SQLModel, select

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from models import Course
from services.parser import PrerequisiteParser


def clean_prerequisite(prereq_text: str) -> str:
    """Clean prerequisite text."""
    if not prereq_text:
        return ""
    
    # Remove "Either" prefix
    prereq_text = re.sub(r'^Either\s+', '', prereq_text, flags=re.IGNORECASE)
    
    # Remove grade requirements
    prereq_text = re.sub(r'\s*all with a minimum grade of [A-D][+-]?', '', prereq_text, flags=re.IGNORECASE)
    prereq_text = re.sub(r',?\s*with a minimum grade of [A-D][+-]?', '', prereq_text, flags=re.IGNORECASE)
    
    # Remove program-specific text
    prereq_text = re.sub(r',?\s*for students in .*?(?:program|major)', '', prereq_text, flags=re.IGNORECASE)
    
    return prereq_text.strip()


def fetch_prerequisite(dept: str, number: str, term: str = '2025fa') -> str:
    """Fetch prerequisite from CourSys."""
    url = f'https://coursys.sfu.ca/browse/info/{term}-{dept.lower()}-{number.lower()}-d1?data=yes'
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            desc = data.get('descrlong', '')
            
            # Extract prerequisite
            match = re.search(r'Prerequisite[s]?:\s*(.+?)(?:<br|$)', desc, re.IGNORECASE)
            if match:
                prereq = match.group(1).strip()
                return clean_prerequisite(prereq)
    except Exception as e:
        print(f"  Error fetching {dept}-{number}: {e}")
    
    return ""


def main():
    # Database setup
    DATABASE_URL = "sqlite:///./sfu_scheduler.db"
    engine = create_engine(DATABASE_URL, echo=False)
    
    # Create tables
    print("Creating database tables...")
    SQLModel.metadata.create_all(engine)
    
    # Load course data
    json_path = Path(__file__).parent / "data" / "fall_2025_courses_with_enrollment.json"
    with open(json_path, 'r') as f:
        courses_data = json.load(f)
    
    print(f"Loaded {len(courses_data)} course sections from JSON")
    
    # Deduplicate by course (dept + number)
    unique_courses = {}
    for course in courses_data:
        info = course.get('info', {})
        dept = info.get('dept')
        number = info.get('number')
        title = info.get('title')
        
        if dept and number:
            course_id = f"{dept}-{number}"
            if course_id not in unique_courses:
                unique_courses[course_id] = {
                    'dept': dept,
                    'number': number,
                    'title': title,
                    'courseDetails': info.get('courseDetails', ''),
                    'credits': info.get('units', '3')
                }
    
    print(f"Found {len(unique_courses)} unique courses")
    
    # Parse prerequisites
    parser = PrerequisiteParser()
    
    # Seed database
    with Session(engine) as session:
        added_count = 0
        updated_count = 0
        
        for course_id, course_info in unique_courses.items():
            dept = course_info['dept']
            number = course_info['number']
            
            # Check if course exists
            existing = session.exec(
                select(Course).where(Course.id == course_id)
            ).first()
            
            # Fetch prerequisite from CourSys
            print(f"Processing {course_id}...", end=' ')
            prereq_raw = fetch_prerequisite(dept, number)
            
            if prereq_raw:
                print(f"✓ Prerequisites: {prereq_raw[:50]}...")
            else:
                print("✗ No prerequisites")
            
            # Parse prerequisite into logic tree
            prereq_logic = None
            if prereq_raw:
                try:
                    prereq_logic = parser.parse(prereq_raw)
                except Exception as e:
                    print(f"  Warning: Failed to parse prerequisites: {e}")
            
            if existing:
                # Update existing course
                existing.title = course_info['title']
                existing.description = course_info['courseDetails']
                existing.credits = course_info['credits']
                existing.prerequisites_raw = prereq_raw
                existing.prerequisites_logic = prereq_logic
                session.add(existing)
                updated_count += 1
            else:
                # Create new course
                new_course = Course(
                    id=course_id,
                    dept=dept,
                    number=number,
                    title=course_info['title'],
                    description=course_info['courseDetails'],
                    credits=course_info['credits'],
                    prerequisites_raw=prereq_raw,
                    prerequisites_logic=prereq_logic
                )
                session.add(new_course)
                added_count += 1
        
        session.commit()
        print(f"\n✅ Database seeded!")
        print(f"   Added: {added_count} courses")
        print(f"   Updated: {updated_count} courses")


if __name__ == "__main__":
    main()

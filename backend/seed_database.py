"""
Seed the database with courses from fall_2025_courses.json

Day 2 Version: Basic seeding without prerequisite parsing.
We'll add the PrerequisiteParser in Day 3 when we build the validation API.
"""
import json
import sys
from pathlib import Path
from sqlmodel import Session, create_engine, SQLModel, select

# Add parent directory to path so we can import models
sys.path.insert(0, str(Path(__file__).parent))

from models import Course, Section
from config import settings


def main():
    """Main seeding function."""
    
    # DATABASE SETUP
    engine = create_engine(settings.DATABASE_URL, echo=False)

    print("📦 Creating database tables...")
    SQLModel.metadata.create_all(engine)
    
    
    #LOAD JSON DATA
    json_path = Path(__file__).parent / "data" / "fall_2025_courses.json"
    
    print(f"📖 Loading course data from {json_path.name}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        courses_data = json.load(f)
    
    print(f"   Found {len(courses_data)} course sections in JSON\n")
    
    
    # DEDUPLICATE COURSES
    
    unique_courses = {}  # Key: "CMPT-120", Value: course info dict
    
    for section_data in courses_data:
        info = section_data.get('info', {})
        dept = info.get('dept')
        number = info.get('number')
        
        if not dept or not number:
            continue  # Skip malformed data
        
        course_id = f"{dept}-{number}"
        
        # Only store first occurrence (all sections have same course info)
        if course_id not in unique_courses:
            unique_courses[course_id] = {
                'id': course_id,
                'dept': dept,
                'number': number,
                'title': info.get('title', 'No Title'),
                'description': info.get('courseDetails', ''),
                'credits': int(info.get('units', '3')),
                'prerequisites_raw': info.get('prerequisites', '').strip() or None
            }
    
    print(f"🎯 Deduplication complete: {len(unique_courses)} unique courses\n")
    
    
    # SEED COURSES
    with Session(engine) as session:
        added_courses = 0
        skipped_courses = 0
        
        print("💾 Seeding Course table...")
        
        for course_id, course_info in unique_courses.items():
            # Check if course already exists (in case we run script twice)
            existing = session.exec(
                select(Course).where(Course.id == course_id)
            ).first()
            
            if existing:
                skipped_courses += 1
                continue
            
            # Create new Course record
            new_course = Course(**course_info)
            session.add(new_course)
            added_courses += 1
            
            # Print progress every 50 courses
            if added_courses % 50 == 0:
                print(f"   Added {added_courses} courses...")
        
        # Commit course insertions
        session.commit()
        print(f"   ✅ Courses: {added_courses} added, {skipped_courses} skipped\n")
        
        
        # 5. SEED SECTIONS
        added_sections = 0
        skipped_sections = 0
        
        print("💾 Seeding Section table...")
        
        for section_data in courses_data:
            info = section_data.get('info', {})
            dept = info.get('dept')
            number = info.get('number')
            section_code = info.get('section')
            term = info.get('term', 'Unknown Term')
            
            if not dept or not number or not section_code:
                continue
            
            course_id = f"{dept}-{number}"
            
            # Check if this exact section already exists
            existing = session.exec(
                select(Section).where(
                    Section.course_id == course_id,
                    Section.term == term,
                    Section.section_code == section_code
                )
            ).first()
            
            if existing:
                skipped_sections += 1
                continue
            
            # Extract instructor (first instructor if multiple)
            instructor_list = section_data.get('instructor', [])
            instructor_name = None
            if instructor_list and len(instructor_list) > 0:
                instructor_name = instructor_list[0].get('name')
            
            # Extract schedule (meeting times)
            schedule_json = []
            for schedule in section_data.get('courseSchedule', []):
                schedule_json.append({
                    'days': schedule.get('days', ''),
                    'start_time': schedule.get('startTime', ''),
                    'end_time': schedule.get('endTime', ''),
                    'campus': schedule.get('campus', ''),
                    'type': schedule.get('sectionCode', 'LEC')
                })
            
            # Extract enrollment data (if available from CourSys scraping)
            enrollment = section_data.get('enrollment', {})
            
            # Create new Section record
            new_section = Section(
                course_id=course_id,
                term=term,
                section_code=section_code,
                instructor=instructor_name,
                schedule_json=schedule_json if schedule_json else None,
                location=section_data.get('courseSchedule', [{}])[0].get('campus') if section_data.get('courseSchedule') else None,
                delivery_method=info.get('deliveryMethod', 'In Person'),
                seats_total=enrollment.get('seats_total', 0),
                seats_enrolled=enrollment.get('seats_enrolled', 0),
                waitlist_total=enrollment.get('waitlist_total', 0),
                waitlist_enrolled=enrollment.get('waitlist_enrolled', 0)
            )
            
            session.add(new_section)
            added_sections += 1
            
            # Print progress every 100 sections
            if added_sections % 100 == 0:
                print(f"   Added {added_sections} sections...")
        
        # Commit section insertions
        session.commit()
        print(f"   ✅ Sections: {added_sections} added, {skipped_sections} skipped\n")
    
    
    # 6. SUMMARY
    # ===========
    print("=" * 60)
    print("🎉 DATABASE SEEDING COMPLETE!")
    print("=" * 60)
    print(f"📚 Courses:  {added_courses} added, {skipped_courses} already existed")
    print(f"📖 Sections: {added_sections} added, {skipped_sections} already existed")
    print(f"📊 Total unique courses: {len(unique_courses)}")
    print(f"📊 Total sections: {len(courses_data)}")
    print("=" * 60)
    
    # Print sample data
    with Session(engine) as session:
        sample_course = session.exec(select(Course).limit(1)).first()
        if sample_course:
            print("\n🔍 Sample Course:")
            print(f"   ID: {sample_course.id}")
            print(f"   Title: {sample_course.title}")
            print(f"   Credits: {sample_course.credits}")
            print(f"   Prerequisites: {sample_course.prerequisites_raw[:80] if sample_course.prerequisites_raw else 'None'}...")
            print(f"   Sections: {len(sample_course.sections)}")


if __name__ == "__main__":
    main()
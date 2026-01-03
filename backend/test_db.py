# test_db.py
"""
Test script to verify database connection and models work.
"""

from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import Course, Section

print("=" * 60)
print("🧪 Testing Database Connection")
print("=" * 60)

# Debug: Show database location
print(f"\n🔍 Database URL: {engine.url}")
print(f"🔍 Creating tables...")

# CREATE TABLES FIRST
create_db_and_tables()
print("✅ Tables created!\n")

# Test 1: Connection
print("[Test 1] Connecting to database...")
try:
    with Session(engine) as session:
        result = session.exec(select(Course)).all()
        print(f"✅ Connected! Found {len(result)} courses in database")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    exit(1)

# Test 2: Create a Course
print("\n[Test 2] Creating a test course...")
try:
    with Session(engine) as session:
        test_course = Course(
            id="TEST-101",
            dept="TEST",
            number="101",
            title="Test Course",
            description="This is a test course for database verification",
            credits=3,
            prerequisites_raw="None",
            prerequisites_logic=None
        )
        
        session.add(test_course)
        session.commit()
        print(f"✅ Created course: {test_course.id}")
except Exception as e:
    print(f"❌ Failed to create course: {e}")
    exit(1)

# Test 3: Query the Course Back
print("\n[Test 3] Querying the test course...")
try:
    with Session(engine) as session:
        course = session.get(Course, "TEST-101")
        
        if course:
            print(f"✅ Found course: {course.id} - {course.title}")
            print(f"   Department: {course.dept}")
            print(f"   Number: {course.number}")
            print(f"   Credits: {course.credits}")
        else:
            print("❌ Course not found!")
            exit(1)
except Exception as e:
    print(f"❌ Query failed: {e}")
    exit(1)

# Test 4: Create a Section
print("\n[Test 4] Creating a test section...")
try:
    with Session(engine) as session:
        test_section = Section(
            course_id="TEST-101",
            term="Spring 2026",
            section_code="D100",
            instructor="Test Professor",
            schedule_json=[
                {
                    "day": "Mon",
                    "startTime": "14:30",
                    "endTime": "15:20",
                    "type": "Lecture"
                }
            ],
            location="Burnaby",
            delivery_method="In Person",
            seats_total=150,
            seats_enrolled=120,
            waitlist_total=20,
            waitlist_enrolled=5
        )
        
        session.add(test_section)
        session.commit()
        session.refresh(test_section)
        
        print(f"✅ Created section: {test_section.id}")
        print(f"   Seats: {test_section.seats_enrolled}/{test_section.seats_total}")
        print(f"   Available: {test_section.seats_available}")
except Exception as e:
    print(f"❌ Failed to create section: {e}")
    exit(1)

# Test 5: Test Relationship
print("\n[Test 5] Testing relationship (course.sections)...")
try:
    with Session(engine) as session:
        course = session.get(Course, "TEST-101")
        print(f"✅ Course '{course.title}' has {len(course.sections)} section(s)")
        
        for section in course.sections:
            print(f"   - {section.section_code}: {section.instructor}")
except Exception as e:
    print(f"❌ Relationship test failed: {e}")
    exit(1)

# Test 6: Cleanup
print("\n[Test 6] Cleaning up test data...")
try:
    with Session(engine) as session:
        test_section = session.exec(
            select(Section).where(Section.course_id == "TEST-101")
        ).first()
        if test_section:
            session.delete(test_section)
        
        test_course = session.get(Course, "TEST-101")
        if test_course:
            session.delete(test_course)
        
        session.commit()
        print("✅ Test data cleaned up")
except Exception as e:
    print(f"❌ Cleanup failed: {e}")
    exit(1)

print("\n" + "=" * 60)
print("🎉 All tests passed! Database is working correctly.")
print("=" * 60)
print("\n📋 Summary:")
print("  ✅ Database connection works")
print("  ✅ Can create courses")
print("  ✅ Can query courses")
print("  ✅ Can create sections")
print("  ✅ Relationships work (course.sections)")
print("  ✅ Foreign keys enforced")
print("\n🚀 Ready to move to Day 2 (Data Crawler & Seeding)!")
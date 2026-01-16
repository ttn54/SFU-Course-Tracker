"""
Test script for PrerequisiteParser

This tests the parser with real SFU prerequisite strings
to verify it correctly builds logic trees.
"""
from services.parser import PrerequisiteParser
import json


def print_tree(tree, indent=0):
    """Pretty print a prerequisite tree."""
    if not tree:
        print("  " * indent + "None")
        return
    
    node_type = tree.get("type")
    
    if node_type == "COURSE":
        print("  " * indent + f"COURSE: {tree.get('course')}")
    
    elif node_type in ("AND", "OR"):
        print("  " * indent + f"{node_type}:")
        for child in tree.get("children", []):
            print_tree(child, indent + 1)
    
    elif node_type == "UNKNOWN":
        print("  " * indent + f"UNKNOWN: {tree.get('expression')}")


def test_parser():
    """Test the parser with various prerequisite strings."""
    parser = PrerequisiteParser()
    
    # Test cases from real SFU courses
    test_cases = [
        # Simple cases
        ("CMPT 120", "Single course"),
        ("CMPT 120 or 130", "Simple OR"),
        ("CMPT 120 and MATH 151", "Simple AND"),
        
        # Comma-separated (implicit AND)
        ("CMPT 120, MATH 151", "Comma-separated AND"),
        ("CMPT 120, MATH 151, MACM 101", "Multiple commas"),
        
        # Mixed operators
        ("CMPT 120 or 130, and MATH 151", "OR with comma and AND"),
        ("CMPT 125 or CMPT 135, and MACM 101", "Real CMPT 201 prereq"),
        
        # Parentheses
        ("(CMPT 120 or 130) and MATH 151", "Parentheses with OR and AND"),
        ("CMPT 120, and (MATH 151 or 154)", "Comma with parentheses"),
        
        # Complex real examples
        ("MACM 101, MATH 152, CMPT 125 or CMPT 135, and (MATH 240 or MATH 232)", "CMPT 210 prereq"),
        ("(CMPT 125 or CMPT 135) and MACM 101", "CMPT 201 with parentheses"),
        
        # With grade requirements (should be cleaned)
        ("CMPT 120 with a minimum grade of C-", "With grade requirement"),
        ("Prerequisite: CMPT 225 with minimum grade of C-", "With prefix and grade"),
        
        # Shorthand (implicit department)
        ("CMPT 120 or 125 or 130", "Shorthand OR"),
        ("MATH 151 or 150 or 154", "Multiple shorthand"),
    ]
    
    print("=" * 70)
    print("PREREQUISITE PARSER TEST SUITE")
    print("=" * 70)
    
    for i, (prereq_string, description) in enumerate(test_cases, 1):
        print(f"\n[Test {i}] {description}")
        print(f"Input:  '{prereq_string}'")
        
        # Parse the prerequisite
        tree = parser.parse(prereq_string)
        
        # Print the tree structure
        print("Tree:")
        print_tree(tree, indent=1)
        
        # Flatten to list of all courses
        courses = parser.flatten_courses(tree)
        print(f"Courses: {courses}")
        
        # Convert back to human-readable string
        readable = parser.tree_to_string(tree)
        print(f"Readable: '{readable}'")
        
        print("-" * 70)
    
    print("\n✅ All tests completed!")
    
    # Additional: Parse a course from the database
    print("\n" + "=" * 70)
    print("REAL DATABASE COURSE TEST")
    print("=" * 70)
    
    from sqlmodel import Session, select
    from models import Course
    from database import get_session
    
    with next(get_session()) as session:
        # Get CMPT-210 (has complex prerequisites)
        course = session.exec(
            select(Course).where(Course.id == "CMPT-210")
        ).first()
        
        if course:
            print(f"\nCourse: {course.id} - {course.title}")
            print(f"Raw prereq: {course.prerequisites_raw}")
            
            if course.prerequisites_raw:
                tree = parser.parse(course.prerequisites_raw)
                print("\nParsed tree:")
                print_tree(tree, indent=1)
                
                courses = parser.flatten_courses(tree)
                print(f"\nAll prerequisite courses: {courses}")
                
                readable = parser.tree_to_string(tree)
                print(f"\nReadable format: {readable}")
        else:
            print("Course not found in database")


if __name__ == "__main__":
    test_parser()
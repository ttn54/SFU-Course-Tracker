"""
Test script for SFU API Crawler
Fetches ALL SFU courses from ALL departments and saves them to JSON
"""
from sfu_api_client import SFUAPIClient, save_courses_to_json
import os


def main():
    os.makedirs('../data', exist_ok=True)
    
    client = SFUAPIClient(rate_limit_delay=0.3)
    
    print("🔍 Discovering available terms...\n")
    
    available_data = []
    for year in ["2025", "2024", "2023"]:
        terms = client.get_terms(year)
        if terms:
            print(f"✅ {year}: {', '.join(terms)}")
            available_data.append((year, terms[0]))
        else:
            print(f"❌ {year}: No data")
    
    if not available_data:
        print("\n❌ No available data found!")
        return
    
    YEAR, TERM = available_data[0]
    
    # Get ALL departments instead of hardcoding
    print(f"\n🔍 Fetching all departments for {TERM} {YEAR}...")
    DEPARTMENTS = client.get_departments(YEAR, TERM)
    
    if not DEPARTMENTS:
        print("❌ Failed to fetch departments!")
        return
    
    print(f"📋 Found {len(DEPARTMENTS)} departments: {', '.join(DEPARTMENTS[:10])}...")
    
    print(f"\n🚀 Starting SFU Course Crawler")
    print(f"📅 Target: {TERM.upper()} {YEAR}")
    print(f"🏢 Departments: ALL ({len(DEPARTMENTS)} total)\n")
    
    all_courses = []
    
    for i, dept in enumerate(DEPARTMENTS, 1):
        print(f"\n[{i}/{len(DEPARTMENTS)}] Crawling {dept.upper()}...")
        try:
            courses = client.crawl_department(YEAR, TERM, dept, include_enrollment=True)
            all_courses.extend(courses)
        except Exception as e:
            print(f"❌ Error crawling {dept.upper()}: {e}")
            continue
    
    if all_courses:
        output_file = f"../data/{TERM}_{YEAR}_all_courses.json"
        save_courses_to_json(all_courses, output_file)
        
        print("\n📊 Crawl Summary:")
        print(f"  Total sections: {len(all_courses)}")
        
        # Department breakdown
        dept_counts = {}
        for course in all_courses:
            dept = course.get('info', {}).get('dept', 'UNKNOWN')
            dept_counts[dept] = dept_counts.get(dept, 0) + 1
        
        print(f"\n  Top departments:")
        for dept, count in sorted(dept_counts.items(), key=lambda x: -x[1])[:10]:
            print(f"    {dept}: {count} sections")
        
        print("\n📖 Sample Course Data:")
        sample = all_courses[0]
        print(f"  Code: {sample.get('info', {}).get('name', 'N/A')}")
        print(f"  Title: {sample.get('info', {}).get('title', 'N/A')}")
        print(f"  Prerequisites: {sample.get('info', {}).get('prerequisites', 'None')}")
    else:
        print("❌ No courses found!")


if __name__ == "__main__":
    main()
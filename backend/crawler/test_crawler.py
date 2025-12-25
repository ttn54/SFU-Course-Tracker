"""
Test script for SFU API Crawler
Fetches CMPT courses and saves them to JSON
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
    DEPARTMENTS = ["cmpt"]
    
    print(f"\n🚀 Starting SFU Course Crawler")
    print(f"📅 Target: {TERM.upper()} {YEAR}")
    print(f"🏢 Departments: {', '.join([d.upper() for d in DEPARTMENTS])}\n")
    
    all_courses = []
    
    for dept in DEPARTMENTS:
        courses = client.crawl_department(YEAR, TERM, dept)
        all_courses.extend(courses)
    
    if all_courses:
        output_file = f"../data/{TERM}_{YEAR}_courses.json"
        save_courses_to_json(all_courses, output_file)
        
        print("\n📖 Sample Course Data:")
        sample = all_courses[0]
        print(f"  Code: {sample.get('info', {}).get('name', 'N/A')}")
        print(f"  Title: {sample.get('info', {}).get('title', 'N/A')}")
        print(f"  Prerequisites: {sample.get('info', {}).get('prerequisites', 'None')}")
    else:
        print("❌ No courses found!")


if __name__ == "__main__":
    main()
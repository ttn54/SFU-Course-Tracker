"""
SFU Course Outlines API Client
Fetches course data from SFU's public API
"""
import requests
import time
from typing import Dict, List, Optional
import json


class SFUAPIClient:
    BASE_URL = "http://www.sfu.ca/bin/wcm/course-outlines"
    
    def __init__(self, rate_limit_delay: float = 0.5):
        """
        Initialize the SFU API client
        
        Args:
            rate_limit_delay: Delay between requests in seconds (to be respectful)
        """
        self.rate_limit_delay = rate_limit_delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'SFU-Course-Tracker/1.0 (Educational Project)'
        })
    
    def _make_request(self, params: str) -> Optional[Dict]:
        """
        Make a GET request to the API with error handling
        
        Args:
            params: Query parameters (e.g., "2024/fall/cmpt")
            
        Returns:
            JSON response as dictionary, or None if request fails
        """
        url = f"{self.BASE_URL}?{params}"
        
        try:
            time.sleep(self.rate_limit_delay)
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching {url}: {e}")
            return None
    
    def get_terms(self, year: str) -> List[str]:
        """Get available terms for a given year"""
        data = self._make_request(year)
        if data:
            return [term['value'] for term in data]
        return []
    
    def get_departments(self, year: str, term: str) -> List[str]:
        """Get all departments offering courses in a term"""
        data = self._make_request(f"{year}/{term}")
        if data:
            return [dept['value'] for dept in data]
        return []
    
    def get_courses(self, year: str, term: str, dept: str) -> List[Dict]:
        """Get all courses for a department in a term"""
        data = self._make_request(f"{year}/{term}/{dept}")
        if data:
            return data
        return []
    
    def get_course_sections(self, year: str, term: str, dept: str, course_number: str) -> List[Dict]:
        """Get all sections for a specific course"""
        data = self._make_request(f"{year}/{term}/{dept}/{course_number}")
        if data:
            return data
        return []
    
    def get_section_details(self, year: str, term: str, dept: str, 
                           course_number: str, section: str) -> Optional[Dict]:
        """Get detailed information for a specific section"""
        data = self._make_request(f"{year}/{term}/{dept}/{course_number}/{section}")
        return data
    
    def crawl_department(self, year: str, term: str, dept: str) -> List[Dict]:
        """
        Crawl all courses and their details for a department
        """
        print(f"📚 Crawling {dept.upper()} courses for {term} {year}...")
        
        courses = self.get_courses(year, term, dept)
        detailed_courses = []
        
        for course in courses:
            course_number = course.get('value')
            if not course_number:
                continue
            
            print(f"  → Fetching {dept.upper()} {course_number}...")
            
            sections = self.get_course_sections(year, term, dept, course_number)
            
            if sections:
                first_section = sections[0].get('value')
                if first_section:
                    details = self.get_section_details(year, term, dept, 
                                                      course_number, first_section)
                    if details:
                        detailed_courses.append(details)
        
        print(f"✅ Crawled {len(detailed_courses)} courses from {dept.upper()}")
        return detailed_courses


def save_courses_to_json(courses: List[Dict], filename: str):
    """Save course data to a JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved {len(courses)} courses to {filename}")
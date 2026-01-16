"""
SFU Course Outlines API Client
Fetches course data from SFU's public API and enrollment data from CourSys
"""
import requests
import time
from typing import Dict, List, Optional, Tuple
import json
import re
from bs4 import BeautifulSoup


class SFUAPIClient:
    BASE_URL = "http://www.sfu.ca/bin/wcm/course-outlines"
    COURSYS_URL = "https://coursys.sfu.ca/browse/info"
    
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
    
    def get_enrollment_data(self, year: str, term: str, dept: str, 
                           course_number: str, section: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Fetch enrollment data from CourSys browse/info endpoint
        
        Returns:
            Tuple of (enrolled/capacity, waitlist) e.g., ("161/331", "5")
            Returns (None, None) if data cannot be fetched
        """
        # Convert term format: "2025/fall" -> "2025fa"
        term_map = {
            'spring': 'sp',
            'summer': 'su', 
            'fall': 'fa'
        }
        
        term_code = term_map.get(term.lower(), term[:2])
        year_short = year
        
        # Convert section format: "D100" -> "d1", "D101" -> "d1", "D200" -> "d2"
        # Take first letter + first digit only
        section_code = section.lower()
        if len(section_code) >= 2:
            # Extract first letter and first digit (e.g., "d100" -> "d1", "d101" -> "d1")
            import re
            match = re.match(r'^([a-z])(\d)', section_code)
            if match:
                section_code = match.group(1) + match.group(2)
        
        # Build CourSys URL
        coursys_id = f"{year_short}{term_code}-{dept.lower()}-{course_number.lower()}-{section_code}"
        url = f"{self.COURSYS_URL}/{coursys_id}"
        
        try:
            time.sleep(self.rate_limit_delay)
            response = self.session.get(url, timeout=10)
            
            if response.status_code != 200:
                return None, None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            text = soup.get_text()
            
            # Extract enrollment: "Enrolment161 out of 331" or "200 out of 200 (39 on waitlist)"
            enrollment_pattern = r'Enrolment\s*(\d+)\s*out of\s*(\d+)'
            enrollment_match = re.search(enrollment_pattern, text)
            
            enrolled_capacity = None
            if enrollment_match:
                enrolled = enrollment_match.group(1)
                capacity = enrollment_match.group(2)
                enrolled_capacity = f"{enrolled}/{capacity}"
            
            # Extract waitlist: "(39 on waitlist)" or "(15 on waitlist)"
            waitlist = None
            waitlist_patterns = [
                r'\((\d+)\s+on\s+waitlist\)',  # (39 on waitlist) - most common format
                r'waitlist:\s*(\d+)',           # Waitlist: 15
                r'(\d+)\s+on\s+waitlist',       # 15 on waitlist (without parens)
            ]
            
            for pattern in waitlist_patterns:
                waitlist_match = re.search(pattern, text, re.IGNORECASE)
                if waitlist_match:
                    waitlist = waitlist_match.group(1)
                    break
            
            return enrolled_capacity, waitlist
            
        except Exception as e:
            print(f"  ⚠️ Could not fetch enrollment from CourSys: {e}")
            return None, None
    
    def crawl_department(self, year: str, term: str, dept: str, include_enrollment: bool = True) -> List[Dict]:
        """
        Crawl all courses and their details for a department
        
        Args:
            year: Year (e.g., "2025")
            term: Term (e.g., "fall")
            dept: Department code (e.g., "cmpt")
            include_enrollment: Whether to fetch real-time enrollment data from CourSys
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
            
            for section_info in sections:
                section = section_info.get('value')
                if section:
                    details = self.get_section_details(year, term, dept, 
                                                      course_number, section)
                    if details:
                        # Add enrollment data if requested
                        if include_enrollment:
                            enrolled, waitlist = self.get_enrollment_data(
                                year, term, dept, course_number, section
                            )
                            if enrolled or waitlist:
                                details['enrollmentData'] = {
                                    'enrolled': enrolled,
                                    'waitlist': waitlist
                                }
                                print(f"    ✓ {section}: {enrolled} enrolled" + 
                                     (f", {waitlist} waitlist" if waitlist else ""))
                        
                        detailed_courses.append(details)
        
        print(f"✅ Crawled {len(detailed_courses)} sections from {dept.upper()}")
        return detailed_courses


def save_courses_to_json(courses: List[Dict], filename: str):
    """Save course data to a JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved {len(courses)} courses to {filename}")
"""
SFU Course Crawler Service.
Fetches course data from SFU's public API with async concurrency control.
"""
import asyncio
import logging
from typing import Optional, Any
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

from config import settings

logger = logging.getLogger(__name__)


class SFUCrawler:
    """Async crawler for SFU course data."""
    
    def __init__(self):
        self.base_url = settings.SFU_API_BASE_URL
        self.timeout = settings.CRAWLER_TIMEOUT
        self.semaphore = asyncio.Semaphore(settings.CRAWLER_CONCURRENCY_LIMIT)
        
    async def fetch_departments(self) -> list[str]:
        """Fetch list of all departments."""
        # Common SFU departments
        return [
            "CMPT", "MATH", "ENSC", "PHYS", "STAT", "CHEM", "BISC",
            "ECON", "BUS", "PSYC", "PHIL", "HIST", "ENGL", "FREN"
        ]
    
    async def fetch_course_outlines(
        self, 
        dept: str, 
        term: str = "2026/spring"
    ) -> list[dict[str, Any]]:
        """
        Fetch all course outlines for a department in a given term.
        
        Args:
            dept: Department code (e.g., "CMPT")
            term: Term in format "YYYY/season" (e.g., "2026/spring")
            
        Returns:
            List of course data dictionaries
        """
        async with self.semaphore:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    # First, get the list of courses
                    url = f"{self.base_url}?{term}/{dept}"
                    response = await client.get(url)
                    response.raise_for_status()
                    
                    courses_data = response.json()
                    
                    if not isinstance(courses_data, list):
                        logger.warning(f"Unexpected response format for {dept}: {type(courses_data)}")
                        return []
                    
                    # Parse each course
                    courses = []
                    for course_info in courses_data:
                        if isinstance(course_info, dict) and "value" in course_info:
                            course_number = course_info["value"]
                            course_details = await self._fetch_course_details(
                                dept, course_number, term
                            )
                            if course_details:
                                courses.append(course_details)
                    
                    logger.info(f"Fetched {len(courses)} courses for {dept}")
                    return courses
                    
            except httpx.HTTPError as e:
                logger.error(f"HTTP error fetching {dept}: {e}")
                return []
            except Exception as e:
                logger.error(f"Error fetching {dept}: {e}")
                return []
    
    async def _fetch_course_details(
        self,
        dept: str,
        number: str,
        term: str
    ) -> Optional[dict[str, Any]]:
        """Fetch detailed information for a specific course."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}?{term}/{dept}/{number}"
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                
                # Parse the course data
                course_id = f"{dept}-{number}"
                
                # Extract basic course info
                course_data = {
                    "id": course_id,
                    "dept": dept,
                    "number": number,
                    "title": data.get("title", ""),
                    "description": data.get("description", ""),
                    "credits": self._parse_credits(data.get("units", "3")),
                    "prerequisites_raw": data.get("prerequisites", ""),
                    "sections": []
                }
                
                # Fetch sections for this course
                sections = await self._fetch_sections(dept, number, term)
                course_data["sections"] = sections
                
                return course_data
                
        except Exception as e:
            logger.error(f"Error fetching details for {dept} {number}: {e}")
            return None
    
    async def _fetch_sections(
        self,
        dept: str,
        number: str,
        term: str
    ) -> list[dict[str, Any]]:
        """Fetch all sections for a course."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # This would hit a sections endpoint
                # For now, return mock structure that matches what we expect
                url = f"{self.base_url}?{term}/{dept}/{number}"
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                sections_list = []
                
                # Parse sections from the response
                if "courseSchedule" in data:
                    for section_data in data["courseSchedule"]:
                        section = self._parse_section(section_data, term)
                        if section:
                            sections_list.append(section)
                
                return sections_list
                
        except Exception as e:
            logger.error(f"Error fetching sections for {dept} {number}: {e}")
            return []
    
    def _parse_section(self, section_data: dict[str, Any], term: str) -> Optional[dict[str, Any]]:
        """Parse section data into our format."""
        try:
            schedule = []
            
            # Parse schedule information
            if "schedule" in section_data:
                for sched in section_data["schedule"]:
                    schedule.append({
                        "day": sched.get("day", ""),
                        "start": self._normalize_time(sched.get("startTime", "")),
                        "end": self._normalize_time(sched.get("endTime", "")),
                        "type": sched.get("scheduleType", "Lecture")
                    })
            
            return {
                "term": self._format_term(term),
                "section_code": section_data.get("sectionCode", ""),
                "instructor": section_data.get("instructor", {}).get("name", "TBD"),
                "schedule_json": schedule,
                "location": section_data.get("campus", "Burnaby Campus"),
                "delivery_method": section_data.get("deliveryMethod", "In Person"),
                "seats_total": int(section_data.get("enrollmentCap", 0)),
                "seats_enrolled": int(section_data.get("enrollmentTotal", 0)),
                "waitlist_total": int(section_data.get("waitlistCap", 0)),
                "waitlist_enrolled": int(section_data.get("waitlistTotal", 0))
            }
            
        except Exception as e:
            logger.error(f"Error parsing section: {e}")
            return None
    
    def _normalize_time(self, time_str: str) -> str:
        """
        Normalize time format to 24-hour HH:MM.
        
        Examples:
            "2:30 PM" -> "14:30"
            "14:30" -> "14:30"
        """
        if not time_str:
            return ""
        
        time_str = time_str.strip()
        
        # If already in 24-hour format
        if ":" in time_str and len(time_str.split(":")[0]) <= 2:
            if "AM" not in time_str.upper() and "PM" not in time_str.upper():
                return time_str
        
        # Parse 12-hour format
        try:
            time_obj = datetime.strptime(time_str, "%I:%M %p")
            return time_obj.strftime("%H:%M")
        except ValueError:
            try:
                time_obj = datetime.strptime(time_str, "%I:%M%p")
                return time_obj.strftime("%H:%M")
            except ValueError:
                return time_str
    
    def _parse_credits(self, units_str: str) -> int:
        """Parse credit string to integer."""
        try:
            # Extract first number from string
            import re
            match = re.search(r'\d+', str(units_str))
            if match:
                return int(match.group())
            return 3
        except:
            return 3
    
    def _format_term(self, term: str) -> str:
        """
        Format term string.
        
        Examples:
            "2026/spring" -> "Spring 2026"
            "2025/fall" -> "Fall 2025"
        """
        try:
            parts = term.split("/")
            if len(parts) == 2:
                year, season = parts
                return f"{season.capitalize()} {year}"
            return term
        except:
            return term
    
    async def crawl_all_courses(
        self,
        departments: Optional[list[str]] = None,
        term: str = "2026/spring"
    ) -> list[dict[str, Any]]:
        """
        Crawl all courses for multiple departments.
        
        Args:
            departments: List of department codes. If None, fetches all departments.
            term: Term to fetch data for.
            
        Returns:
            List of all course data
        """
        if departments is None:
            departments = await self.fetch_departments()
        
        logger.info(f"Starting crawl for {len(departments)} departments")
        
        # Fetch all departments concurrently
        tasks = [
            self.fetch_course_outlines(dept, term)
            for dept in departments
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Flatten results
        all_courses = []
        for result in results:
            if isinstance(result, list):
                all_courses.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Task failed with exception: {result}")
        
        logger.info(f"Crawl complete. Total courses: {len(all_courses)}")
        return all_courses
    
    async def fetch_seat_count(self, dept: str, number: str, section: str, term: str) -> dict[str, int]:
        """
        Scrape current seat availability from CourSys.
        This is used by the background worker for real-time updates.
        
        Returns:
            Dictionary with seat counts: {
                'seats_total': int,
                'seats_enrolled': int,
                'waitlist_total': int,
                'waitlist_enrolled': int
            }
        """
        try:
            # Build CourSys URL (this is an example structure)
            courys_url = f"{settings.SFU_COURYS_BASE_URL}/{term}/{dept}/{number}/{section}"
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(courys_url)
                response.raise_for_status()
                
                # Parse HTML with BeautifulSoup
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract seat information (adjust selectors based on actual HTML structure)
                seats_data = {
                    'seats_total': 0,
                    'seats_enrolled': 0,
                    'waitlist_total': 0,
                    'waitlist_enrolled': 0
                }
                
                # Example parsing (adjust based on actual HTML)
                enrollment_section = soup.find('div', class_='enrollment')
                if enrollment_section:
                    # Parse enrollment numbers from HTML
                    # This is a placeholder - actual implementation depends on HTML structure
                    text = enrollment_section.get_text()
                    import re
                    
                    enrolled_match = re.search(r'Enrolled:\s*(\d+)/(\d+)', text)
                    if enrolled_match:
                        seats_data['seats_enrolled'] = int(enrolled_match.group(1))
                        seats_data['seats_total'] = int(enrolled_match.group(2))
                    
                    waitlist_match = re.search(r'Waitlist:\s*(\d+)/(\d+)', text)
                    if waitlist_match:
                        seats_data['waitlist_enrolled'] = int(waitlist_match.group(1))
                        seats_data['waitlist_total'] = int(waitlist_match.group(2))
                
                return seats_data
                
        except Exception as e:
            logger.error(f"Error fetching seat count for {dept} {number} {section}: {e}")
            return {
                'seats_total': 0,
                'seats_enrolled': 0,
                'waitlist_total': 0,
                'waitlist_enrolled': 0
            }

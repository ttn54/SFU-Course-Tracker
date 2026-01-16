"""
API endpoints for fetching course prerequisites from CourSys
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import re
from typing import Optional

router = APIRouter(prefix="/prerequisites", tags=["prerequisites"])

class PrerequisiteResponse(BaseModel):
    course_id: str
    prerequisite: str

def extract_prerequisite(descrlong: str) -> str:
    """
    Extract prerequisite text from course description
    """
    if not descrlong:
        return ""
    
    # Find "Prerequisite:" and extract until the next period
    patterns = [
        r'Prerequisite:\s*(.+?\.)(?:\s|$)',
        r'Prerequisites:\s*(.+?\.)(?:\s|$)',
        r'Prereq:\s*(.+?\.)(?:\s|$)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, descrlong, re.IGNORECASE | re.DOTALL)
        if match:
            prereq_text = match.group(1).strip()
            # Clean up common prefixes and suffixes
            prereq_text = re.sub(r'^Either\s+', '', prereq_text, flags=re.IGNORECASE)
            prereq_text = re.sub(r',?\s*all with a minimum grade of [A-Z][-+]?\.?$', '', prereq_text, flags=re.IGNORECASE)
            prereq_text = re.sub(r',?\s*with a minimum grade of [A-Z][-+]?\.?$', '', prereq_text, flags=re.IGNORECASE)
            prereq_text = re.sub(r'\s+for students in an? [^,)]+(?:program)?', '', prereq_text, flags=re.IGNORECASE)
            # Remove trailing period
            prereq_text = prereq_text.rstrip('.')
            return prereq_text.strip()
    
    return ""

@router.get("/{dept}/{number}", response_model=PrerequisiteResponse)
async def get_prerequisite(dept: str, number: str, term: str = "2025fa"):
    """
    Fetch prerequisite for a specific course from CourSys
    """
    # For the first section (typically D1 or D100 -> d1)
    section_code = "d1"
    
    url = f"https://coursys.sfu.ca/browse/info/{term}-{dept.lower()}-{number.lower()}-{section_code}?data=yes"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            descrlong = data.get('descrlong', '')
            prerequisite = extract_prerequisite(descrlong)
            
            return PrerequisiteResponse(
                course_id=f"{dept.upper()}-{number}",
                prerequisite=prerequisite
            )
        else:
            raise HTTPException(status_code=404, detail=f"Course not found on CourSys")
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Failed to fetch from CourSys: {str(e)}")

"""
Professor rating endpoints
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.rmp_client import get_professor_rating

router = APIRouter(prefix="/professors", tags=["professors"])


@router.get("/rating/{professor_name}")
async def get_rating(professor_name: str):
    """
    Get RateMyProfessors rating for a professor
    Searches RMP using their GraphQL API and returns the first result
    """
    try:
        rating_data = get_professor_rating(professor_name)
        
        if not rating_data:
            return {
                "found": False,
                "message": f"No ratings found for {professor_name}"
            }
        
        return {
            "found": True,
            "data": rating_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

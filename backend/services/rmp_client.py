"""
RateMyProfessors GraphQL API client
Uses RMP's internal GraphQL endpoint to fetch professor ratings
"""
import requests
from typing import Optional, Dict

class RMPClient:
    def __init__(self):
        self.graphql_url = "https://www.ratemyprofessors.com/graphql"
        self.authorization = "Basic dGVzdDp0ZXN0"  # RMP's public authorization header
        self.headers = {
            'Authorization': self.authorization,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://www.ratemyprofessors.com',
            'Referer': 'https://www.ratemyprofessors.com/'
        }
        # SFU School ID on RateMyProfessors
        self.sfu_school_id = "U2Nob29sLTE0ODI="  # Base64 encoded "School-1482"
    
    def search_professor(self, name: str) -> Optional[Dict]:
        """
        Search for a professor using RMP's GraphQL API
        Returns: {
            'name': str,
            'rmpId': str,
            'rating': float,
            'numRatings': int,
            'wouldTakeAgain': float (optional),
            'difficulty': float (optional),
            'department': str
        }
        """
        try:
            # GraphQL query to search for professors at SFU specifically
            # Using the query structure that properly filters by schoolID
            query = """
            query TeacherSearchResultsPageQuery($query: TeacherSearchQuery!) {
              search: newSearch {
                teachers(query: $query, first: 8) {
                  edges {
                    cursor
                    node {
                      id
                      legacyId
                      firstName
                      lastName
                      avgRating
                      numRatings
                      wouldTakeAgainPercent
                      avgDifficulty
                      department
                      school {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
            """
            
            variables = {
                "query": {
                    "text": name,
                    "schoolID": self.sfu_school_id
                }
            }
            
            payload = {
                "query": query,
                "variables": variables
            }
            
            response = requests.post(
                self.graphql_url,
                json=payload,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"RMP API returned status {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return None
            
            data = response.json()
            
            # Extract professor data from GraphQL response
            edges = data.get('data', {}).get('search', {}).get('teachers', {}).get('edges', [])
            
            if not edges or len(edges) == 0:
                return None
            
            # Filter results to only SFU professors (in case the API returns other schools)
            sfu_professors = [
                edge['node'] for edge in edges 
                if edge['node'].get('school', {}).get('id') == self.sfu_school_id
            ]
            
            # If no SFU professors found, return None
            if not sfu_professors:
                return None
            
            # Get the first SFU result (they're sorted by relevance)
            professor = sfu_professors[0]
            
            return {
                'name': f"{professor.get('firstName', '')} {professor.get('lastName', '')}".strip(),
                'rmpId': str(professor.get('legacyId', '')),
                'rating': float(professor.get('avgRating', 0)),
                'numRatings': int(professor.get('numRatings', 0)),
                'wouldTakeAgain': float(professor.get('wouldTakeAgainPercent', 0)) if professor.get('wouldTakeAgainPercent') not in [None, -1] else None,
                'difficulty': float(professor.get('avgDifficulty', 0)) if professor.get('avgDifficulty') else None,
                'department': professor.get('department', '')
            }
                
        except Exception as e:
            print(f"Error searching RMP GraphQL API: {e}")
            return None


# Global instance
rmp_client = RMPClient()


def get_professor_rating(name: str) -> Optional[Dict]:
    """Convenience function to get professor rating"""
    return rmp_client.search_professor(name)

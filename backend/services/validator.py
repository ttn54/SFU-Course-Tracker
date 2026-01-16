"""
Prerequisite Validation Service.
Uses NetworkX DAG to validate if a student meets course prerequisites.
"""
import logging
from typing import Optional, Any
import networkx as nx

from sqlmodel import Session, select
from models import Course
from services.parser import PrerequisiteParser

logger = logging.getLogger(__name__)


class PrerequisiteValidator:
    """
    Validates student transcripts against course prerequisites using DAG.
    """
    
    def __init__(self, session: Session):
        self.session = session
        self.parser = PrerequisiteParser()
        self.graph: Optional[nx.DiGraph] = None
    
    def build_prerequisite_graph(self) -> nx.DiGraph:
        """
        Build a directed acyclic graph of all course prerequisites.
        
        Each edge (A -> B) means "A is a prerequisite for B"
        """
        graph = nx.DiGraph()
        
        # Fetch all courses with prerequisites
        statement = select(Course).where(Course.prerequisites_logic.is_not(None))
        courses = self.session.exec(statement).all()
        
        for course in courses:
            # Add the course as a node
            graph.add_node(course.id)
            
            # Extract all prerequisite courses from the logic tree
            if course.prerequisites_logic:
                prereq_courses = self.parser.flatten_courses(course.prerequisites_logic)
                
                # Add edges from prerequisites to this course
                for prereq in prereq_courses:
                    graph.add_edge(prereq, course.id)
        
        self.graph = graph
        logger.info(f"Built prerequisite graph with {graph.number_of_nodes()} nodes and {graph.number_of_edges()} edges")
        
        return graph
    
    def validate_prerequisites(
        self,
        target_course: str,
        transcript: list[str]
    ) -> dict[str, Any]:
        """
        Validate if a student can take a course based on their transcript.
        
        Args:
            target_course: Course ID (e.g., "CMPT-300")
            transcript: List of completed course IDs (e.g., ["CMPT-120", "CMPT-125"])
            
        Returns:
            Dictionary with validation results:
            {
                "is_valid": bool,
                "missing_courses": list[str],
                "prerequisite_tree": dict,
                "message": str
            }
        """
        # Normalize course ID format
        target_course = self._normalize_course_id(target_course)
        transcript = [self._normalize_course_id(c) for c in transcript]
        
        # Fetch the target course
        statement = select(Course).where(Course.id == target_course)
        course = self.session.exec(statement).first()
        
        if not course:
            return {
                "target_course": target_course,
                "is_valid": False,
                "missing_courses": [],
                "prerequisite_tree": None,
                "message": f"Course {target_course} not found"
            }
        
        # If no prerequisites, automatically valid
        if not course.prerequisites_logic:
            return {
                "target_course": target_course,
                "is_valid": True,
                "missing_courses": [],
                "prerequisite_tree": None,
                "message": f"{target_course} has no prerequisites"
            }
        
        # Validate against the prerequisite tree
        is_valid, missing = self._validate_tree(
            course.prerequisites_logic,
            set(transcript)
        )
        
        message = (
            f"You meet all prerequisites for {target_course}"
            if is_valid
            else f"Missing prerequisites: {', '.join(missing)}"
        )
        
        return {
            "target_course": target_course,
            "is_valid": is_valid,
            "missing_courses": missing,
            "prerequisite_tree": course.prerequisites_logic,
            "message": message
        }
    
    def _validate_tree(
        self,
        tree: dict[str, Any],
        completed_courses: set[str]
    ) -> tuple[bool, list[str]]:
        """
        Recursively validate a prerequisite tree.
        
        Args:
            tree: Prerequisite logic tree
            completed_courses: Set of completed course IDs
            
        Returns:
            Tuple of (is_valid, missing_courses)
        """
        node_type = tree.get("type")
        
        if node_type == "COURSE":
            course = tree.get("course")
            if course in completed_courses:
                return True, []
            else:
                return False, [course]
        
        elif node_type == "AND":
            # All children must be satisfied
            all_valid = True
            all_missing = []
            
            for child in tree.get("children", []):
                valid, missing = self._validate_tree(child, completed_courses)
                if not valid:
                    all_valid = False
                    all_missing.extend(missing)
            
            return all_valid, all_missing
        
        elif node_type == "OR":
            # At least one child must be satisfied
            for child in tree.get("children", []):
                valid, missing = self._validate_tree(child, completed_courses)
                if valid:
                    return True, []
            
            # If none are valid, collect all possible options
            all_options = []
            for child in tree.get("children", []):
                _, missing = self._validate_tree(child, completed_courses)
                all_options.extend(missing)
            
            # Return unique options
            return False, list(set(all_options))
        
        else:
            # Unknown type - assume invalid
            return False, []
    
    def get_missing_prerequisites(
        self,
        target_course: str,
        transcript: list[str]
    ) -> list[str]:
        """
        Get a list of missing prerequisites for a course.
        
        Args:
            target_course: Course ID
            transcript: List of completed courses
            
        Returns:
            List of missing course IDs
        """
        result = self.validate_prerequisites(target_course, transcript)
        return result["missing_courses"]
    
    def get_prerequisite_chain(self, course_id: str) -> list[str]:
        """
        Get the full chain of prerequisites for a course using the DAG.
        
        Args:
            course_id: Course ID
            
        Returns:
            List of all courses that must be taken before this one
        """
        if not self.graph:
            self.build_prerequisite_graph()
        
        course_id = self._normalize_course_id(course_id)
        
        if course_id not in self.graph:
            return []
        
        try:
            # Get all ancestors (courses that lead to this one)
            ancestors = nx.ancestors(self.graph, course_id)
            return list(ancestors)
        except nx.NetworkXError:
            return []
    
    def get_courses_enabled_by(self, course_id: str) -> list[str]:
        """
        Get courses that become available after completing this course.
        
        Args:
            course_id: Course ID
            
        Returns:
            List of course IDs that list this course as a prerequisite
        """
        if not self.graph:
            self.build_prerequisite_graph()
        
        course_id = self._normalize_course_id(course_id)
        
        if course_id not in self.graph:
            return []
        
        try:
            # Get all descendants (courses that require this one)
            descendants = nx.descendants(self.graph, course_id)
            return list(descendants)
        except nx.NetworkXError:
            return []
    
    def suggest_next_courses(
        self,
        transcript: list[str],
        limit: int = 10
    ) -> list[dict[str, Any]]:
        """
        Suggest courses the student can take next based on their transcript.
        Shows courses where at least one prerequisite is met (for courses with prerequisites)
        or courses with no prerequisites.
        
        Args:
            transcript: List of completed courses
            limit: Maximum number of suggestions
            
        Returns:
            List of course suggestions with metadata including whether prerequisites are fully met
        """
        if not self.graph:
            self.build_prerequisite_graph()
        
        transcript_set = set(self._normalize_course_id(c) for c in transcript)
        suggestions = []
        
        # Get all courses
        statement = select(Course)
        all_courses = self.session.exec(statement).all()
        
        for course in all_courses:
            # Skip if already taken
            if course.id in transcript_set:
                continue
            
            # Check if prerequisites are met
            if course.prerequisites_logic:
                is_valid, missing = self._validate_tree(
                    course.prerequisites_logic,
                    transcript_set
                )
                
                # Check if at least one prerequisite is met (but only for real prerequisites)
                has_any_prereq = self._has_any_prerequisite(
                    course.prerequisites_logic,
                    transcript_set
                )
                
                # Check if the prerequisite is just an UNKNOWN type (like recommendations)
                has_real_prereqs = self._has_real_prerequisites(course.prerequisites_logic)
                
                # Include if:
                # 1. Fully eligible, OR
                # 2. At least one prereq is met (and has real prerequisites), OR
                # 3. Has no real prerequisites (only UNKNOWN/recommendations)
                if is_valid or has_any_prereq or not has_real_prereqs:
                    suggestions.append({
                        "course_id": course.id,
                        "title": course.title,
                        "dept": course.dept,
                        "number": course.number,
                        "credits": course.credits,
                        "prerequisites": course.prerequisites_raw or "",
                        "prerequisites_logic": course.prerequisites_logic,
                        "is_eligible": is_valid or not has_real_prereqs,
                        "missing_prerequisites": missing if not (is_valid or not has_real_prereqs) else []
                    })
            else:
                # No prerequisites - always available
                suggestions.append({
                    "course_id": course.id,
                    "title": course.title,
                    "dept": course.dept,
                    "prerequisites": course.prerequisites_raw or "",
                    "prerequisites_logic": None,
                    "number": course.number,
                    "credits": course.credits,
                    "is_eligible": True,
                    "missing_prerequisites": []
                })
        
        return suggestions[:limit]
    
    def _has_any_prerequisite(
        self,
        tree: dict[str, Any],
        completed_courses: set[str]
    ) -> bool:
        """
        Check if the student has completed at least one prerequisite course.
        
        Args:
            tree: Prerequisite logic tree
            completed_courses: Set of completed course IDs
            
        Returns:
            True if at least one prerequisite course is completed
        """
        node_type = tree.get("type")
        
        if node_type == "COURSE":
            course = tree.get("course")
            return course in completed_courses
        
        elif node_type in ["AND", "OR"]:
            # Check if any child has a completed course
            for child in tree.get("children", []):
                if self._has_any_prerequisite(child, completed_courses):
                    return True
            return False
        
        else:
            return False
    
    def _has_real_prerequisites(self, tree: dict[str, Any]) -> bool:
        """
        Check if the tree contains real prerequisite courses (not just UNKNOWN/recommendations).
        
        Args:
            tree: Prerequisite logic tree
            
        Returns:
            True if tree contains at least one COURSE node, False if only UNKNOWN
        """
        node_type = tree.get("type")
        
        if node_type == "COURSE":
            return True
        
        elif node_type in ["AND", "OR"]:
            # Check if any child has real prerequisites
            for child in tree.get("children", []):
                if self._has_real_prerequisites(child):
                    return True
            return False
        
        else:
            # UNKNOWN or other types = not a real prerequisite
            return False
    
    def _normalize_course_id(self, course_id: str) -> str:
        """
        Normalize course ID to standard format.
        
        Examples:
            "CMPT 300" -> "CMPT-300"
            "cmpt300" -> "CMPT-300"
            "CMPT-300" -> "CMPT-300"
        """
        # Remove spaces and convert to uppercase
        course_id = course_id.replace(" ", "").upper()
        
        # Add hyphen if missing
        if "-" not in course_id:
            # Find where letters end and numbers begin
            for i, char in enumerate(course_id):
                if char.isdigit():
                    course_id = f"{course_id[:i]}-{course_id[i:]}"
                    break
        
        return course_id

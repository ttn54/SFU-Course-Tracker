"""
Prerequisite Logic Parser V2 - Correct handling of comma-separated lists.
Converts prerequisite strings into structured boolean trees.
"""
import re
import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)


class PrerequisiteParser:
    """
    Parses SFU prerequisite strings into structured logic trees.
    
    Key insight: "A, B, C or D, and E" means "A AND B AND (C OR D) AND E"
    NOT "(A AND B AND C) OR (D AND E)"
    
    The "or" is local to adjacent courses, not global.
    """
    
    def __init__(self):
        # Regex patterns
        self.course_pattern = re.compile(r'\b([A-Z]{3,4})[\s-](\d{3}[A-Z]?)\b')
    
    def parse(self, prereq_string: str) -> Optional[dict[str, Any]]:
        """Parse a prerequisite string into a logic tree."""
        if not prereq_string or prereq_string.strip() == "":
            return None
        
        try:
            # Clean the string
            prereq_string = self._clean_string(prereq_string)
            
            if not prereq_string:
                return None
            
            # Parse the expression
            tree = self._parse_expression(prereq_string)
            
            return tree
            
        except Exception as e:
            logger.error(f"Error parsing prerequisite '{prereq_string}': {e}")
            return None
    
    def _clean_string(self, s: str) -> str:
        """Clean and normalize the prerequisite string."""
        # Remove common prefixes
        s = re.sub(r'^(Prerequisite|Corequisite|Pre-?req)s?:?\s*', '', s, flags=re.IGNORECASE)
        
        # Remove exclusion clauses
        s = re.sub(r'\.?\s+Students?\s+.*?(may not|cannot).*?further credit.*?(?=\.|$)', '', s, flags=re.IGNORECASE)
        
        # Remove grade requirements
        s = re.sub(r'\.\s*[A-Z][^.]*?\b(at least|minimum|with)\s+(a\s+)?[A-B][+-]?.*?(?=\.|$)', '', s, flags=re.IGNORECASE)
        
        # Remove "One W course" type requirements
        s = re.sub(r'\bOne\s+W\s+course,?\s*', '', s, flags=re.IGNORECASE)
        
        # Normalize whitespace
        s = ' '.join(s.split())
        
        # Normalize 'and both' to 'and'
        s = re.sub(r',\s*both\b', '', s, flags=re.IGNORECASE)
        s = re.sub(r'\bboth\b', 'and', s, flags=re.IGNORECASE)
        
        # Normalize AND/OR
        s = re.sub(r'\b(AND)\b', 'and', s, flags=re.IGNORECASE)
        s = re.sub(r'\b(OR)\b', 'or', s, flags=re.IGNORECASE)
        
        # Remove trailing periods and commas
        s = s.rstrip('.,;')
        
        return s
    
    def _parse_expression(self, expr: str) -> dict[str, Any]:
        """
        Parse expression with correct handling of commas and operators.
        
        Strategy:
        1. Split by top-level " and " -> these are AND groups
        2. For each AND group, split by "," -> these are also AND
        3. Within each comma-separated item, split by " or " -> these are OR
        4. Handle parentheses recursively
        """
        expr = expr.strip()
        
        # Split by top-level " and " (respecting parentheses)
        and_parts = self._split_respecting_parens(expr, ' and ')
        
        if len(and_parts) > 1:
            children = []
            for part in and_parts:
                parsed = self._parse_and_group(part.strip())
                if parsed:
                    children.append(parsed)
            
            if len(children) == 1:
                return children[0]
            return {"type": "AND", "children": children}
        
        # No top-level AND, parse as single AND group
        return self._parse_and_group(expr)
    
    def _parse_and_group(self, expr: str) -> dict[str, Any]:
        """
        Parse a group that's connected by commas (implicit AND).
        Within this group, items can have local OR.
        """
        # Split by commas (respecting parentheses)
        comma_parts = self._split_respecting_parens(expr, ',')
        
        if len(comma_parts) > 1:
            children = []
            for part in comma_parts:
                parsed = self._parse_or_group(part.strip())
                if parsed:
                    children.append(parsed)
            
            if len(children) == 1:
                return children[0]
            return {"type": "AND", "children": children}
        
        # No commas, parse as OR group
        return self._parse_or_group(expr)
    
    def _parse_or_group(self, expr: str) -> dict[str, Any]:
        """Parse a group that might have local OR operators."""
        # Check if this is a parenthesized expression
        expr = expr.strip()
        
        if expr.startswith('(') and expr.endswith(')'):
            # Remove outer parentheses and parse recursively
            inner = expr[1:-1].strip()
            return self._parse_expression(inner)
        
        # Split by " or " (respecting parentheses)
        or_parts = self._split_respecting_parens(expr, ' or ')
        
        if len(or_parts) > 1:
            children = []
            for part in or_parts:
                parsed = self._parse_atom(part.strip())
                if parsed:
                    children.append(parsed)
            
            if len(children) == 1:
                return children[0]
            return {"type": "OR", "children": children}
        
        # No OR, parse as atom
        return self._parse_atom(expr)
    
    def _parse_atom(self, expr: str) -> dict[str, Any]:
        """Parse a single atom (course, parenthesized expression, or unknown)."""
        expr = expr.strip()
        
        if not expr:
            return None
        
        # Handle parenthesized expressions - parse as or_group to avoid infinite recursion
        if expr.startswith('(') and expr.endswith(')'):
            inner = expr[1:-1].strip()
            return self._parse_or_group(inner)
        
        # Extract courses
        courses = self._extract_courses(expr)
        
        if len(courses) == 1:
            return {"type": "COURSE", "course": courses[0]}
        elif len(courses) > 1:
            # Multiple courses in a single atom - should be OR
            return {
                "type": "OR",
                "children": [{"type": "COURSE", "course": c} for c in courses]
            }
        else:
            # No courses found
            return {"type": "UNKNOWN", "expression": expr}
    
    def _split_respecting_parens(self, expr: str, delimiter: str) -> list[str]:
        """Split expression by delimiter, respecting parentheses."""
        parts = []
        current = ""
        paren_depth = 0
        i = 0
        
        while i < len(expr):
            # Check if we're at the delimiter
            if paren_depth == 0 and expr[i:i+len(delimiter)] == delimiter:
                parts.append(current)
                current = ""
                i += len(delimiter)
                continue
            
            char = expr[i]
            if char == '(':
                paren_depth += 1
            elif char == ')':
                paren_depth -= 1
            
            current += char
            i += 1
        
        if current:
            parts.append(current)
        
        return [p.strip() for p in parts if p.strip()]
    
    def _extract_courses(self, text: str) -> list[str]:
        """Extract course codes from text."""
        courses = []
        last_dept = None
        
        # Find full course codes (DEPT NUMBER)
        for match in self.course_pattern.finditer(text):
            dept, number = match.groups()
            courses.append(f"{dept}-{number}")
            last_dept = dept
        
        # Find standalone numbers (inherit department)
        if last_dept and not courses:
            # If no full courses found but we have context, look for numbers
            number_pattern = re.compile(r'\b(\d{3}[A-Z]?)\b')
            for match in number_pattern.finditer(text):
                number = match.group(1)
                # Make sure it's not already part of a full course code
                pos = match.start()
                if pos > 0 and text[pos-1].isalpha():
                    continue
                courses.append(f"{last_dept}-{number}")
        
        return courses
    
    def flatten_courses(self, tree: Optional[dict[str, Any]]) -> list[str]:
        """Flatten a prerequisite tree into a list of all courses."""
        if not tree:
            return []
        
        courses = []
        
        def traverse(node: dict[str, Any]) -> None:
            if node.get("type") == "COURSE":
                course = node.get("course")
                if course and course not in courses:
                    courses.append(course)
            elif "children" in node:
                for child in node["children"]:
                    traverse(child)
        
        traverse(tree)
        return courses
    
    def tree_to_string(self, tree: Optional[dict[str, Any]]) -> str:
        """Convert a prerequisite tree to a human-readable string."""
        if not tree:
            return ""
        
        node_type = tree.get("type")
        
        if node_type == "COURSE":
            return tree.get("course", "")
        
        elif node_type in ("AND", "OR"):
            children = tree.get("children", [])
            child_strings = [self.tree_to_string(child) for child in children]
            operator = " AND " if node_type == "AND" else " OR "
            
            # Add parentheses for nested structures
            formatted_children = []
            for i, (child, child_str) in enumerate(zip(children, child_strings)):
                child_type = child.get("type")
                # Add parens if child is opposite operator or has nested structure
                if child_type in ("AND", "OR") and child_type != node_type:
                    formatted_children.append(f"( {child_str} )")
                else:
                    formatted_children.append(child_str)
            
            return operator.join(formatted_children)
        
        elif node_type == "UNKNOWN":
            return tree.get("expression", "")
        
        return ""

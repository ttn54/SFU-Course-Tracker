"""
Prerequisite Logic Parser.
Converts prerequisite strings into structured boolean trees.
"""
import re
import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)


class PrerequisiteParser:
    """
    Parses SFU prerequisite strings into structured logic trees.
    
    Examples:
        "CMPT 120 or 125" -> {"type": "OR", "courses": ["CMPT-120", "CMPT-125"]}
        "CMPT 120 and 125" -> {"type": "AND", "courses": ["CMPT-120", "CMPT-125"]}
        "CMPT 120 and (MATH 150 or 151)" -> nested structure
    """
    
    def __init__(self):
        # Regex patterns
        self.course_pattern = re.compile(r'\b([A-Z]{3,4})\s*(\d{3}[A-Z]?)\b')
        self.number_only_pattern = re.compile(r'\b(\d{3}[A-Z]?)\b')
        
    def parse(self, prereq_string: str) -> Optional[dict[str, Any]]:
        """
        Parse a prerequisite string into a logic tree.
        
        Args:
            prereq_string: Raw prerequisite string
            
        Returns:
            Dictionary representing the logic tree, or None if parsing fails
        """
        if not prereq_string or prereq_string.strip() == "":
            return None
        
        try:
            # Clean the string
            prereq_string = self._clean_string(prereq_string)
            
            # If empty after cleaning, return None
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
        
        # Remove exclusion clauses (sentences with "may not take" or "cannot take")
        # These are typically at the end after a period
        s = re.sub(r'\.?\s+Students?\s+.*?(may not|cannot).*?further credit.*?(?=\.|$)', '', s, flags=re.IGNORECASE)
        
        # Remove grade requirements and substitution clauses
        s = re.sub(r'\.\s*[A-Z][^.]*?\b(at least|minimum|with)\s+(a\s+)?[A-B][+-]?.*?(?=\.|$)', '', s, flags=re.IGNORECASE)
        
        # Remove "One W course" type requirements (not verifiable in our system)
        s = re.sub(r'\bOne\s+W\s+course,?\s*', '', s, flags=re.IGNORECASE)
        
        # Normalize whitespace
        s = ' '.join(s.split())
        
        # Replace ', and' or ', both' with just ' and'
        s = re.sub(r',\s*and\b', ' and', s, flags=re.IGNORECASE)
        s = re.sub(r',\s*both\b', ' and', s, flags=re.IGNORECASE)
        
        # Replace commas that are clearly AND separators
        # Pattern: "COURSE, COURSE, COURSE or COURSE, and ..." -> convert middle commas to 'and'
        # This is tricky - we need to identify comma-separated course lists
        # Strategy: Replace ", " with " and " EXCEPT when followed by "and" or "or"
        def replace_comma(match):
            return ' and '
        
        # Replace comma + space, but not if followed by 'and' or 'or' or if at end
        s = re.sub(r',\s+(?!and\b|or\b)', ' and ', s, flags=re.IGNORECASE)
        
        # Normalize AND/OR operators
        s = re.sub(r'\b(AND)\b', 'and', s, flags=re.IGNORECASE)
        s = re.sub(r'\b(OR)\b', 'or', s, flags=re.IGNORECASE)
        
        # Remove trailing periods and commas
        s = s.rstrip('.,')
        
        return s
    
    def _parse_expression(self, expr: str, last_dept: Optional[str] = None) -> dict[str, Any]:
        """
        Recursively parse an expression into a tree structure using proper tokenization.
        
        Precedence: Parentheses > AND > OR
        """
        expr = expr.strip()
        
        if not expr:
            return {"type": "UNKNOWN", "expression": ""}
        
        # Tokenize the expression into courses, operators, and parenthesized groups
        tokens = self._tokenize(expr, last_dept)
        
        if not tokens:
            return {"type": "UNKNOWN", "expression": expr}
        
        # Parse tokens with operator precedence: OR (lowest) > AND (highest)
        return self._parse_tokens(tokens)
    
    def _tokenize(self, expr: str, last_dept: Optional[str] = None) -> list[tuple[str, Any]]:
        """
        Tokenize expression into (type, value) pairs.
        Types: 'course', 'operator', 'group', 'unknown'
        """
        tokens = []
        i = 0
        paren_depth = 0
        paren_content = ""
        
        while i < len(expr):
            char = expr[i]
            
            if char == '(':
                if paren_depth == 0:
                    paren_content = ""
                else:
                    paren_content += char
                paren_depth += 1
                
            elif char == ')':
                paren_depth -= 1
                if paren_depth == 0:
                    # Recursively tokenize the parenthesized content
                    tokens.append(('group', paren_content.strip()))
                    paren_content = ""
                else:
                    paren_content += char
                    
            elif paren_depth > 0:
                paren_content += char
            else:
                i += 1
                continue  # Process outside parentheses separately
            
            i += 1
        
        # Now tokenize the content outside parentheses
        # Remove parenthesized sections temporarily
        expr_without_parens = expr
        paren_placeholders = []
        paren_depth = 0
        result = []
        temp = ""
        
        for char in expr:
            if char == '(':
                if paren_depth == 0:
                    result.append(temp)
                    temp = ""
                    placeholder = f"__PAREN_{len(paren_placeholders)}__"
                    result.append(placeholder)
                    paren_placeholders.append(placeholder)
                paren_depth += 1
            elif char == ')':
                paren_depth -= 1
                if paren_depth < 0:
                    paren_depth = 0
            elif paren_depth == 0:
                temp += char
        
        result.append(temp)
        expr_without_parens = ''.join(result)
        
        # Tokenize the flat expression
        flat_tokens = []
        parts = re.split(r'\s+(and|or)\s+', expr_without_parens, flags=re.IGNORECASE)
        
        for part in parts:
            part = part.strip()
            if not part:
                continue
            
            part_lower = part.lower()
            if part_lower in ('and', 'or'):
                flat_tokens.append(('operator', part_lower))
            elif part.startswith('__PAREN_'):
                flat_tokens.append(('placeholder', part))
            else:
                # Extract courses from this part
                courses = self._extract_courses(part, last_dept)
                if courses:
                    for course in courses:
                        flat_tokens.append(('course', course))
                        last_dept = course.split('-')[0]
                elif part.strip():
                    flat_tokens.append(('unknown', part))
        
        # Replace placeholders with group tokens
        final_tokens = []
        paren_index = 0
        for token_type, token_value in flat_tokens:
            if token_type == 'placeholder':
                # Find corresponding group from our earlier tokenization
                for tok_type, tok_value in tokens:
                    if tok_type == 'group':
                        final_tokens.append((tok_type, tok_value))
                        break
            else:
                final_tokens.append((token_type, token_value))
        
        return final_tokens
    
    def _parse_tokens(self, tokens: list[tuple[str, Any]]) -> dict[str, Any]:
        """
        Parse tokens with proper operator precedence.
        OR has lowest precedence, AND has highest.
        """
        if not tokens:
            return {"type": "UNKNOWN", "expression": ""}
        
        # First, convert tokens to nodes (recursively parse groups)
        nodes = []
        for token_type, token_value in tokens:
            if token_type == 'course':
                nodes.append(('node', {"type": "COURSE", "course": token_value}))
            elif token_type == 'operator':
                nodes.append(('operator', token_value))
            elif token_type == 'group':
                # Recursively parse the group
                parsed = self._parse_expression(token_value)
                nodes.append(('node', parsed))
            elif token_type == 'unknown':
                nodes.append(('node', {"type": "UNKNOWN", "expression": token_value}))
        
        if not nodes:
            return {"type": "UNKNOWN", "expression": ""}
        
        # Split by OR (lowest precedence)
        or_groups = []
        current_group = []
        
        for item in nodes:
            if item[0] == 'operator' and item[1] == 'or':
                if current_group:
                    or_groups.append(current_group)
                current_group = []
            else:
                current_group.append(item)
        
        if current_group:
            or_groups.append(current_group)
        
        # Process each OR group (connected by AND)
        or_results = []
        for group in or_groups:
            # Filter out operators and get just nodes
            group_nodes = [item[1] for item in group if item[0] == 'node']
            
            if len(group_nodes) == 0:
                continue
            elif len(group_nodes) == 1:
                or_results.append(group_nodes[0])
            else:
                # Multiple nodes in this group = connected by AND
                or_results.append({"type": "AND", "children": group_nodes})
        
        if len(or_results) == 0:
            return {"type": "UNKNOWN", "expression": ""}
        elif len(or_results) == 1:
            return or_results[0]
        else:
            return {"type": "OR", "children": or_results}
    
    
    def _extract_courses(self, text: str, last_dept: Optional[str] = None) -> list[str]:
        """
        Extract course codes from text.
        
        Handles cases like:
            "CMPT 120" -> ["CMPT-120"]
            "CMPT 120 or 125" -> ["CMPT-120", "CMPT-125"] (with context)
            "120" -> ["CMPT-120"] (if last_dept is "CMPT")
        """
        courses = []
        
        # Find full course codes (DEPT NUMBER)
        matches = self.course_pattern.findall(text)
        for dept, number in matches:
            courses.append(f"{dept}-{number}")
            last_dept = dept
        
        # Find standalone numbers (inherit department from context)
        if last_dept:
            # Remove already matched full courses to avoid duplicates
            remaining_text = text
            for dept, number in matches:
                remaining_text = remaining_text.replace(f"{dept} {number}", "", 1)
                remaining_text = remaining_text.replace(f"{dept}{number}", "", 1)
            
            # Find remaining numbers
            number_matches = self.number_only_pattern.findall(remaining_text)
            for number in number_matches:
                course_code = f"{last_dept}-{number}"
                if course_code not in courses:
                    courses.append(course_code)
        
        return courses
    
    def flatten_courses(self, tree: Optional[dict[str, Any]]) -> list[str]:
        """
        Flatten a prerequisite tree into a simple list of all mentioned courses.
        
        Args:
            tree: The prerequisite tree structure
            
        Returns:
            List of course codes
        """
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
        """
        Convert a prerequisite tree back to a human-readable string.
        
        Args:
            tree: The prerequisite tree structure
            
        Returns:
            Human-readable prerequisite string
        """
        if not tree:
            return ""
        
        node_type = tree.get("type")
        
        if node_type == "COURSE":
            return tree.get("course", "")
        
        elif node_type in ("AND", "OR"):
            children = tree.get("children", [])
            child_strings = [self.tree_to_string(child) for child in children]
            operator = " and " if node_type == "AND" else " or "
            
            # Add parentheses if nested
            formatted_children = []
            for i, (child, child_str) in enumerate(zip(children, child_strings)):
                if child.get("type") in ("AND", "OR") and child.get("type") != node_type:
                    formatted_children.append(f"({child_str})")
                else:
                    formatted_children.append(child_str)
            
            return operator.join(formatted_children)
        
        elif node_type == "UNKNOWN":
            return tree.get("expression", "")
        
        return ""

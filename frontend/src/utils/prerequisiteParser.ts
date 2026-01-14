/**
 * Parses SFU prerequisite strings and checks if a student meets the requirements
 * 
 * Handles formats like:
 * - "CMPT 120 or CMPT 130"
 * - "(CMPT 125 or CMPT 135) and MACM 101"
 * - "MACM 101, MATH 152, CMPT 125 or CMPT 135, and (MATH 240 or MATH 232)"
 */

interface PrereqNode {
  type: 'course' | 'or' | 'and';
  value?: string; // course code like "CMPT 120"
  children?: PrereqNode[];
}

export class PrerequisiteParser {
  /**
   * Extract all course codes from a prerequisite string
   * Returns courses in format "DEPT-NUMBER" (e.g., "CMPT-120")
   */
  static extractCourses(prereqString: string): string[] {
    if (!prereqString || prereqString.trim() === '') return [];
    
    // Match patterns like "CMPT 120", "MATH 240", etc.
    const coursePattern = /([A-Z]{3,4})\s+(\d{3}[A-Z]?)/g;
    const matches = prereqString.matchAll(coursePattern);
    
    const courses = new Set<string>();
    for (const match of matches) {
      const dept = match[1];
      const number = match[2];
      courses.add(`${dept}-${number}`);
    }
    
    return Array.from(courses);
  }

  /**
   * Parse prerequisite string into a logical tree structure
   */
  static parse(prereqString: string): PrereqNode | null {
    if (!prereqString || prereqString.trim() === '') return null;

    // Clean the string
    let cleaned = prereqString
      .replace(/,\s*with\s+a\s+minimum\s+grade\s+of\s+[A-Z][-+]?/gi, '') // Remove grade requirements
      .replace(/,\s*all\s+with\s+a\s+minimum\s+grade\s+of\s+[A-Z][-+]?/gi, '') // Remove "all with minimum grade"
      .replace(/,\s*both\s+with\s+a\s+minimum\s+grade\s+of\s+[A-Z][-+]?/gi, '') // Remove "both with minimum grade"
      .replace(/\s+with\s+a\s+minimum\s+grade\s+of\s+[A-Z][-+]?\.?/gi, '.') // Remove trailing grade requirements
      .replace(/\s+is\s+recommended\.?/gi, '') // Remove "is recommended"
      .replace(/BC\s+Math\s+12\s+\([^)]+\)/gi, '') // Remove BC Math 12 stuff
      .replace(/\(or\s+equivalent[^)]*\)/gi, '') // Remove "(or equivalent...)"
      .trim();

    // If nothing left after cleaning, return null
    if (!cleaned || !this.extractCourses(cleaned).length) return null;

    return this.parseExpression(cleaned);
  }

  private static parseExpression(expr: string): PrereqNode | null {
    expr = expr.trim();
    if (!expr) return null;

    // Remove outer parentheses if they wrap the whole expression
    if (expr.startsWith('(') && expr.endsWith(')')) {
      let depth = 0;
      let isOuterParen = true;
      for (let i = 0; i < expr.length; i++) {
        if (expr[i] === '(') depth++;
        if (expr[i] === ')') depth--;
        if (depth === 0 && i < expr.length - 1) {
          isOuterParen = false;
          break;
        }
      }
      if (isOuterParen) {
        return this.parseExpression(expr.slice(1, -1));
      }
    }

    // Check for top-level "and" first (highest precedence)
    const andParts = this.splitOnTopLevel(expr, ' and ');
    if (andParts.length > 1) {
      return {
        type: 'and',
        children: andParts.map(part => this.parseExpression(part)).filter(Boolean) as PrereqNode[]
      };
    }

    // Check for "comma then or" pattern (e.g., "A, B or C" means "A OR B OR C")
    // In SFU prerequisites, commas before "or" are just list separators
    if (expr.includes(',') && / or /.test(expr)) {
      // Replace commas with " or " to normalize
      const normalized = expr.replace(/,\s*/g, ' or ');
      return this.parseExpression(normalized);
    }

    // Split on top-level "or"
    const orParts = this.splitOnTopLevel(expr, ' or ');
    if (orParts.length > 1) {
      return {
        type: 'or',
        children: orParts.map(part => this.parseExpression(part)).filter(Boolean) as PrereqNode[]
      };
    }

    // Handle comma-separated list (treat as AND only if no "or" present)
    const commaParts = this.splitOnTopLevel(expr, ',');
    if (commaParts.length > 1) {
      return {
        type: 'and',
        children: commaParts.map(part => this.parseExpression(part.trim())).filter(Boolean) as PrereqNode[]
      };
    }

    // Try to extract a single course
    const courses = this.extractCourses(expr);
    if (courses.length === 1) {
      return {
        type: 'course',
        value: courses[0]
      };
    } else if (courses.length > 1) {
      // Multiple courses without explicit connector - treat as OR
      return {
        type: 'or',
        children: courses.map(c => ({ type: 'course' as const, value: c }))
      };
    }

    return null;
  }

  /**
   * Split string on delimiter, respecting parentheses nesting
   */
  private static splitOnTopLevel(expr: string, delimiter: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;
    let i = 0;

    while (i < expr.length) {
      const char = expr[i];
      
      if (char === '(') {
        depth++;
        current += char;
      } else if (char === ')') {
        depth--;
        current += char;
      } else if (depth === 0 && expr.substring(i, i + delimiter.length) === delimiter) {
        if (current.trim()) {
          parts.push(current.trim());
        }
        current = '';
        i += delimiter.length - 1;
      } else {
        current += char;
      }
      
      i++;
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts.length > 0 ? parts : [expr];
  }

  /**
   * Check if student meets prerequisites
   */
  static checkPrerequisites(prereqTree: PrereqNode | null, completedCourses: string[]): {
    satisfied: boolean;
    missing: string[];
  } {
    if (!prereqTree) {
      return { satisfied: true, missing: [] };
    }

    const completed = new Set(completedCourses.map(c => c.toUpperCase()));

    const check = (node: PrereqNode): { satisfied: boolean; missing: string[] } => {
      if (node.type === 'course') {
        const satisfied = completed.has(node.value!.toUpperCase());
        return {
          satisfied,
          missing: satisfied ? [] : [node.value!]
        };
      }

      if (node.type === 'and') {
        const results = node.children!.map(check);
        const allSatisfied = results.every(r => r.satisfied);
        const missing = results.flatMap(r => r.missing);
        return {
          satisfied: allSatisfied,
          missing: allSatisfied ? [] : missing
        };
      }

      if (node.type === 'or') {
        const results = node.children!.map(check);
        const anySatisfied = results.some(r => r.satisfied);
        
        if (anySatisfied) {
          return { satisfied: true, missing: [] };
        }
        
        // Return the shortest missing list (easiest path to satisfy)
        const sortedResults = results.sort((a, b) => a.missing.length - b.missing.length);
        return {
          satisfied: false,
          missing: sortedResults[0].missing
        };
      }

      return { satisfied: true, missing: [] };
    };

    return check(prereqTree);
  }

  /**
   * Get a human-readable description of prerequisites
   */
  static describe(prereqTree: PrereqNode | null): string {
    if (!prereqTree) return 'None';

    const describe = (node: PrereqNode, depth: number = 0): string => {
      if (node.type === 'course') {
        return node.value!;
      }

      if (node.type === 'and') {
        const parts = node.children!.map(c => describe(c, depth + 1));
        return depth > 0 ? `(${parts.join(' AND ')})` : parts.join(' AND ');
      }

      if (node.type === 'or') {
        const parts = node.children!.map(c => describe(c, depth + 1));
        return `(${parts.join(' OR ')})`;
      }

      return '';
    };

    return describe(prereqTree);
  }

  /**
   * Get structured prerequisite data for UI rendering
   * Returns logical groups that represent the requirement
   */
  static getStructuredPrereqs(prereqString: string): {
    andGroups: string[][];
    orGroups: string[][];
  } {
    const tree = this.parse(prereqString);
    if (!tree) return { andGroups: [], orGroups: [] };

    const andGroups: string[][] = [];
    const orGroups: string[][] = [];

    // Helper to collect all courses from a node
    const collectCourses = (node: PrereqNode): string[] => {
      if (node.type === 'course' && node.value) {
        return [node.value];
      }
      if (!node.children) return [];
      return node.children.flatMap(child => collectCourses(child));
    };

    // If root is a simple course
    if (tree.type === 'course' && tree.value) {
      andGroups.push([tree.value]);
      return { andGroups, orGroups };
    }

    // If root is AND - all courses are required
    if (tree.type === 'and' && tree.children) {
      tree.children.forEach(child => {
        if (child.type === 'course' && child.value) {
          andGroups.push([child.value]);
        } else if (child.type === 'or') {
          const courses = collectCourses(child);
          if (courses.length > 0) {
            orGroups.push(courses);
          }
        } else if (child.type === 'and') {
          // Nested AND - collect all courses as required
          const courses = collectCourses(child);
          courses.forEach(c => andGroups.push([c]));
        }
      });
      return { andGroups, orGroups };
    }

    // If root is OR - show as alternative groups
    if (tree.type === 'or' && tree.children) {
      const allCourses = collectCourses(tree);
      if (allCourses.length > 0) {
        orGroups.push(allCourses);
      }
      return { andGroups, orGroups };
    }

    return { andGroups, orGroups };
  }
}

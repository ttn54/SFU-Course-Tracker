const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface APISection {
  id: string;
  course_id: string;
  section_code: string;
  instructor: string;
  schedule: string;
  location: string;
  seats_total: number;
  seats_available: number;
  waitlist_total: number;
  waitlist_available: number;
}

export interface APICourse {
  id: string;
  department: string;
  number: string;
  title: string;
  description: string;
  credits: number;
  prerequisites_text?: string;
  prerequisites_logic?: any;
  sections: APISection[];
}

export const api = {
  // Get all courses from the backend
  async getAllCourses(): Promise<APICourse[]> {
    const response = await fetch(`${API_BASE_URL}/courses/all`);
    if (!response.ok) throw new Error('Failed to fetch all courses');
    return response.json();
  },

  // Search courses
  async searchCourses(query: string): Promise<APICourse[]> {
    const response = await fetch(`${API_BASE_URL}/courses/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to fetch courses');
    return response.json();
  },

  // Get all courses for a department
  async getCoursesByDepartment(dept: string, term?: string): Promise<APICourse[]> {
    const params = new URLSearchParams({ department: dept });
    if (term) params.append('term', term);
    const response = await fetch(`${API_BASE_URL}/courses?${params}`);
    if (!response.ok) throw new Error('Failed to fetch courses');
    return response.json();
  },

  // Get sections for a specific course
  async getCourseSections(courseId: string): Promise<APISection[]> {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/sections`);
    if (!response.ok) throw new Error('Failed to fetch sections');
    return response.json();
  },

  // Get all departments
  async getDepartments(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/courses/departments`);
    if (!response.ok) throw new Error('Failed to fetch departments');
    return response.json();
  },

  // Crawl all courses (admin function)
  async crawlAllCourses(term: string, department: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/courses/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term, department })
    });
    if (!response.ok) throw new Error('Failed to crawl courses');
    return response.json();
  },

  // Get live enrollment data for a single course
  async getLiveEnrollment(dept: string, number: string, section: string, term: string = '2025/fall'): Promise<{
    dept: string;
    number: string;
    section: string;
    enrolled: string;
    waitlist: string;
    timestamp: string;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/courses/enrollment/${dept}/${number}/${section}?term=${encodeURIComponent(term)}`
    );
    if (!response.ok) throw new Error('Failed to fetch enrollment');
    return response.json();
  },

  // Get live enrollment data for multiple courses at once
  async getBatchEnrollment(courses: Array<{ dept: string; number: string; section: string }>, term: string = '2025/fall'): Promise<Array<{
    dept: string;
    number: string;
    section: string;
    enrolled: string;
    waitlist: string;
    timestamp: string;
  }>> {
    const response = await fetch(
      `${API_BASE_URL}/courses/enrollment/batch?term=${encodeURIComponent(term)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courses)
      }
    );
    if (!response.ok) throw new Error('Failed to fetch batch enrollment');
    return response.json();
  },

  // Get professor rating from RateMyProfessors
  async getProfessorRating(professorName: string): Promise<{
    found: boolean;
    data?: {
      name: string;
      rmpId: string;
      rating: number;
      numRatings: number;
      wouldTakeAgain?: number;
      difficulty?: number;
      department: string;
    };
    message?: string;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/professors/rating/${encodeURIComponent(professorName)}`
    );
    if (!response.ok) throw new Error('Failed to fetch professor rating');
    return response.json();
  }
};

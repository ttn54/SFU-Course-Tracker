import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { CourseSection } from '../types';

interface EnrollmentData {
  [courseId: string]: {
    enrolled: string;
    waitlist: string;
    loading: boolean;
    error?: string;
  };
}

export function useEnrollmentData(courses: CourseSection[], term: string = '2025/fall') {
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData>({});

  useEffect(() => {
    if (courses.length === 0) return;

    // Set all courses to loading state
    const initialData: EnrollmentData = {};
    courses.forEach(course => {
      initialData[course.id] = {
        enrolled: 'Loading...',
        waitlist: '',
        loading: true
      };
    });
    setEnrollmentData(initialData);

    // Fetch enrollment data
    const fetchEnrollment = async () => {
      try {
        const coursesToFetch = courses.map(course => ({
          dept: course.dept,
          number: course.number,
          section: course.section
        }));

        const results = await api.getBatchEnrollment(coursesToFetch, term);

        const newData: EnrollmentData = {};
        results.forEach((result, index) => {
          const course = courses[index];
          if (course) {
            newData[course.id] = {
              enrolled: result.enrolled,
              waitlist: result.waitlist,
              loading: false
            };
          }
        });

        setEnrollmentData(newData);
      } catch (error) {
        console.error('Failed to fetch enrollment data:', error);
        
        // Set error state
        const errorData: EnrollmentData = {};
        courses.forEach(course => {
          errorData[course.id] = {
            enrolled: 'N/A',
            waitlist: '',
            loading: false,
            error: 'Failed to load'
          };
        });
        setEnrollmentData(errorData);
      }
    };

    fetchEnrollment();

    // Refresh enrollment data every 5 minutes
    const interval = setInterval(fetchEnrollment, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [courses, term]);

  return enrollmentData;
}

// Hook for single course enrollment
export function useSingleEnrollment(dept: string, number: string, section: string, term: string = '2025/fall') {
  const [data, setData] = useState({
    enrolled: 'Loading...',
    waitlist: '',
    loading: true,
    error: undefined as string | undefined
  });

  useEffect(() => {
    const fetchEnrollment = async () => {
      try {
        const result = await api.getLiveEnrollment(dept, number, section, term);
        setData({
          enrolled: result.enrolled,
          waitlist: result.waitlist,
          loading: false,
          error: undefined
        });
      } catch (error) {
        setData({
          enrolled: 'N/A',
          waitlist: '',
          loading: false,
          error: 'Failed to load'
        });
      }
    };

    fetchEnrollment();

    // Refresh every 5 minutes
    const interval = setInterval(fetchEnrollment, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [dept, number, section, term]);

  return data;
}

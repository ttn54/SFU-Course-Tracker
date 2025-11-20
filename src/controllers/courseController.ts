import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

// GET /api/courses
// Public: Get a list of all available courses
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { code: 'asc' }
    });

    res.status(200).json(courses);
  } catch (error) {
    console.error('Get all courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/courses/eligible
// Protected: Get courses the user is allowed to take
export const getEligibleCourses = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Get the user's completed courses
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { completedCourses: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const completedCourses = user.completedCourses;

    // 2. Get ALL courses from the database
    const allCourses = await prisma.course.findMany();

    // 3. Filter: Keep only the courses the user is eligible for
    const eligibleCourses = allCourses.filter(course => {
      
      // Rule 1: If I've already taken it, I don't need to take it again.
      if (completedCourses.includes(course.code)) {
        return false; 
      }

      // Rule 2: Check if I have all the prerequisites.
      // v1 LOGIC: We only check the basic "AND" prerequisites list.
      // This is the "mistake" - we are ignoring the OR requirements for now.
      const hasPrerequisites = course.prerequisites.every(prereq =>
        completedCourses.includes(prereq)
      );

      return hasPrerequisites;
    });

    res.status(200).json(eligibleCourses);
  } catch (error) {
    console.error('Get eligible courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
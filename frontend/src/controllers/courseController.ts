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
    const eligibleCourses = allCourses.filter((course: any) => {
      
      // Rule 1: If I've already taken it, I don't need to take it again.
      if (completedCourses.includes(course.code)) {
        return false; 
      }

      // Rule 2: Check if I have all the "AND" prerequisites.
      // Every single course in the prerequisites array must be completed.
      const allAndPrerequisitesMet = course.prerequisites.every((prerequisite: string) =>
        completedCourses.includes(prerequisite)
      );

      if (!allAndPrerequisitesMet) {
        return false; // Missing at least one AND prerequisite
      }

      // Rule 3: Check if I satisfy all "OR" prerequisite groups.
      // For each OR group, I need to have completed at least ONE course from that group.
      if (course.prerequisitesOr && course.prerequisitesOr.length > 0) {
        const allOrGroupsMet = course.prerequisitesOr.every((orGroup: string) => {
          // orGroup is a string like "CMPT 125|CMPT 128"
          // Split it into individual course options
          const options = orGroup.split('|');
          
          // Check if at least ONE of these options is in my completed courses
          return options.some((option: string) => completedCourses.includes(option));
        });

        if (!allOrGroupsMet) {
          return false; // Missing at least one OR group requirement
        }
      }

      // If we get here, all requirements are met!
      return true;
    });

    res.status(200).json(eligibleCourses);
  } catch (error) {
    console.error('Get eligible courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
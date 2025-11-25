import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

// GET /api/user/me
// Get the currently logged-in user's profile
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        completedCourses: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/user/courses
// Update the list of courses the user has completed
export const updateCompletedCourses = async (req: AuthRequest, res: Response) => {
  try {
    const { completedCourses } = req.body;

    // Basic validation
    if (!Array.isArray(completedCourses)) {
      return res.status(400).json({ error: 'completedCourses must be an array' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: { completedCourses },
      select: {
        id: true,
        email: true,
        completedCourses: true
      }
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Update completed courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
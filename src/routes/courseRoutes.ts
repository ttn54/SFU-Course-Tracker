import { Router } from 'express';
import { getAllCourses, getEligibleCourses } from '../controllers/courseController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public route: Anyone can see the course catalog
router.get('/', getAllCourses);

// Protected route: Only logged-in users can see their eligibility
router.get('/eligible', authenticateToken, getEligibleCourses);

export default router;
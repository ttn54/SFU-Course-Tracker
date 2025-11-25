import { Router } from 'express';
import { getCurrentUser, updateCompletedCourses } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Protect all routes with the "bouncer"
router.get('/me', authenticateToken, getCurrentUser);
router.put('/courses', authenticateToken, updateCompletedCourses);

export default router;
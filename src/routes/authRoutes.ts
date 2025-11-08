import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

// When a POST request hits /register, run the register function
router.post('/register', register);

// When a POST request hits /login, run the login function
router.post('/login', login);

export default router;
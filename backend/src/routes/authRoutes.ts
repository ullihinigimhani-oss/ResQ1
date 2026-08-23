import { Router } from 'express';

import { login, register, updateProfile } from '../controllers/authController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.put('/me', authenticateRequest, updateProfile);

export default router;

import { Router } from 'express';

import {
  forgotPassword,
  login,
  register,
  resetAccountPassword,
  updateProfile,
  verifyPasswordResetOtp,
} from '../controllers/authController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyPasswordResetOtp);
router.post('/reset-password', resetAccountPassword);
router.put('/me', authenticateRequest, updateProfile);

export default router;

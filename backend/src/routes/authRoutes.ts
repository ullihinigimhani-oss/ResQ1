import { Router } from 'express';

import {
  changePassword,
  forgotPassword,
  login,
  register,
  resetAccountPassword,
  updateProfile,
  updateVolunteerStatus,
  verifyPassword,
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
router.put('/volunteer-status', authenticateRequest, updateVolunteerStatus);
router.post('/verify-password', authenticateRequest, verifyPassword);
router.put('/change-password', authenticateRequest, changePassword);

export default router;

import { Router } from 'express';

import { createSOS, getActiveSOS, getUserSOSStatus, respondToSOS } from '../controllers/sosController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authenticateRequest, createSOS);
router.get('/active', authenticateRequest, getActiveSOS);
router.get('/my-status', authenticateRequest, getUserSOSStatus);
router.put('/:requestId/respond', authenticateRequest, respondToSOS);

export default router;

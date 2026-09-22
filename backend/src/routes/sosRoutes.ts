import { Router } from 'express';

import { createSOS, getActiveSOS, getUserSOSStatus, respondToSOS, getVolunteerAcceptedSOS, getActiveSOSForVolunteer } from '../controllers/sosController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authenticateRequest, createSOS);
router.get('/active', authenticateRequest, getActiveSOS);
router.get('/active-for-volunteer', authenticateRequest, getActiveSOSForVolunteer);
router.get('/my-status', authenticateRequest, getUserSOSStatus);
router.get('/volunteer-accepted', authenticateRequest, getVolunteerAcceptedSOS);
router.put('/:requestId/respond', authenticateRequest, respondToSOS);

export default router;

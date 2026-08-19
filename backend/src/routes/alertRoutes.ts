import { Router } from 'express';

import {
  createEmergencyAlert,
  getEmergencyAlert,
  listActiveAlerts,
} from '../controllers/alertController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateRequest);

router.get('/', listActiveAlerts);
router.post('/', createEmergencyAlert);
router.get('/:id', getEmergencyAlert);

export default router;

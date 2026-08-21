import { Router } from 'express';

import {
  createEmergencyAlert,
  getEmergencyAlert,
  listActiveAlerts,
  updateEmergencyAlert,
} from '../controllers/alertController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateRequest);

router.get('/', listActiveAlerts);
router.post('/', createEmergencyAlert);
router.put('/:id', updateEmergencyAlert);
router.get('/:id', getEmergencyAlert);

export default router;

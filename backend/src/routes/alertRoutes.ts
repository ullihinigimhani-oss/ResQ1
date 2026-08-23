import { Router } from 'express';

import {
  createEmergencyAlert,
  getEmergencyAlert,
  listAlertHistory,
  listActiveAlerts,
  updateEmergencyAlert,
} from '../controllers/alertController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateRequest);

router.get('/', listActiveAlerts);
router.post('/', createEmergencyAlert);
router.get('/history', listAlertHistory);
router.put('/:id', updateEmergencyAlert);
router.get('/:id', getEmergencyAlert);

export default router;

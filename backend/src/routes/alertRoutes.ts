import { Router } from 'express';

import {
  createEmergencyAlert,
  getEmergencyAlert,
  getEmergencyAlertRiskHistory,
  listAlertHistory,
  listActiveAlerts,
  updateEmergencyAlert,
} from '../controllers/alertController.js';
import {
  getMyAlertPreferences,
  updateMyAlertPreferences,
} from '../controllers/alertPreferenceController.js';
import { registerPushToken } from '../controllers/notificationController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateRequest);

router.get('/', listActiveAlerts);
router.post('/', createEmergencyAlert);
router.get('/preferences', getMyAlertPreferences);
router.put('/preferences', updateMyAlertPreferences);
router.post('/push-token', registerPushToken);
router.get('/history', listAlertHistory);
router.get('/:id/risk-history', getEmergencyAlertRiskHistory);
router.put('/:id', updateEmergencyAlert);
router.get('/:id', getEmergencyAlert);

export default router;

import { Router } from 'express';

import {
  acknowledgeEmergencyAlert,
  createEmergencyAlert,
  getEmergencyAlertAcknowledgement,
  getEmergencyAlertAcknowledgements,
  getEmergencyAlert,
  getEmergencyAlertRiskHistory,
  listAlertHistory,
  listAlertSchools,
  listActiveAlerts,
  searchAlertSchools,
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
router.get('/schools/search', searchAlertSchools);
router.get('/schools', listAlertSchools);
router.get('/history', listAlertHistory);
router.get('/:id/acknowledgement', getEmergencyAlertAcknowledgement);
router.post('/:id/acknowledge', acknowledgeEmergencyAlert);
router.get('/:id/acknowledgements', getEmergencyAlertAcknowledgements);
router.get('/:id/risk-history', getEmergencyAlertRiskHistory);
router.put('/:id', updateEmergencyAlert);
router.get('/:id', getEmergencyAlert);

export default router;

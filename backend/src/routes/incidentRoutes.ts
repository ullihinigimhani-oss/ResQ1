import { Router } from 'express';

import {
  createIncidentReport,
  getMyIncidentReport,
  listMyIncidentReports,
  updateIncidentReportStatus,
} from '../controllers/incidentController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateRequest);

router.post('/', createIncidentReport);
router.get('/my', listMyIncidentReports);
router.patch('/:id/status', updateIncidentReportStatus);
router.get('/:id', getMyIncidentReport);

export default router;

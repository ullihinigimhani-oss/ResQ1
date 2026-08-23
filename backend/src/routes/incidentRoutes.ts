import { Router } from 'express';

import {
  createIncidentReport,
  getMyIncidentReport,
  listAllIncidents,
  listMyIncidentReports,
  updateIncidentStatus,
} from '../controllers/incidentController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateRequest);

router.post('/', createIncidentReport);
router.get('/my', listMyIncidentReports);
router.get('/all', listAllIncidents);
router.patch('/:id/status', updateIncidentStatus);
router.get('/:id', getMyIncidentReport);

export default router;

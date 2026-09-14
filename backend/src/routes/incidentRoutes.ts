import { Router } from 'express';

import {
  createIncidentReport,
  uploadIncidentPhoto,
  getMyIncidentReport,
  listAllIncidents,
  updateIncidentStatus,
  getIncidentPhoto,
  listMyIncidentReports,
  updateIncidentReport,
  deleteIncidentPhoto,
} from '../controllers/incidentController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';
import { incidentPhotoUpload } from '../middleware/incidentPhotoUpload.js';

const router = Router();

router.use(authenticateRequest);

router.post('/', createIncidentReport);
router.post('/:id/photos', incidentPhotoUpload.single('photo'), uploadIncidentPhoto);
router.get('/:id/photos/:photoId', getIncidentPhoto);
router.delete('/:id/photos/:photoId', deleteIncidentPhoto);
router.get('/my', listMyIncidentReports);
router.get('/all', listAllIncidents);
router.patch('/:id/status', updateIncidentStatus);
router.put('/:id', updateIncidentReport);
router.get('/:id', getMyIncidentReport);

export default router;

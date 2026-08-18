import { Router } from 'express';

import {
  getSafeShelter,
  listSafeShelters,
  listShelterEvacuationRoutes,
} from '../controllers/shelterController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateRequest);

router.get('/', listSafeShelters);
router.get('/:id/routes', listShelterEvacuationRoutes);
router.get('/:id', getSafeShelter);

export default router;

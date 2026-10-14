import { Router } from 'express';

import {
  createSafeShelter,
  deleteSafeShelter,
  getSafeShelter,
  listSafeShelters,
  listShelterEvacuationRoutes,
  updateSafeShelter,
} from '../controllers/shelterController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateRequest);

router.get('/', listSafeShelters);
router.post('/', createSafeShelter);
router.put('/:id', updateSafeShelter);
router.delete('/:id', deleteSafeShelter);
router.get('/:id/routes', listShelterEvacuationRoutes);
router.get('/:id', getSafeShelter);

export default router;

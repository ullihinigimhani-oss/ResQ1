import { Router } from 'express';

import {
  createBasicPhoneResident,
  deleteBasicPhoneResident,
  getBasicPhoneResident,
  getBasicPhoneResidents,
  updateBasicPhoneResident,
} from '../controllers/basicPhoneResidentController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateRequest);
router.get('/', getBasicPhoneResidents);
router.post('/', createBasicPhoneResident);
router.get('/:id', getBasicPhoneResident);
router.put('/:id', updateBasicPhoneResident);
router.delete('/:id', deleteBasicPhoneResident);

export default router;

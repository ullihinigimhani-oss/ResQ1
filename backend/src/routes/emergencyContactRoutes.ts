import { Router } from 'express';

import {
  createEmergencyContact,
  deleteEmergencyContact,
  getEmergencyContactById,
  getEmergencyContacts,
  updateEmergencyContact,
} from '../controllers/emergencyContactController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all emergency contact endpoints with JWT authentication
router.use(authenticateRequest);

router.get('/', getEmergencyContacts);
router.post('/', createEmergencyContact);
router.get('/:id', getEmergencyContactById);
router.put('/:id', updateEmergencyContact);
router.delete('/:id', deleteEmergencyContact);

export default router;

import { Router } from 'express';

import {
  createFamilyMember,
  deleteFamilyMember,
  getFamilyMemberById,
  getFamilyMembers,
  updateFamilyMember,
} from '../controllers/familyMemberController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all family member endpoints with JWT authentication
router.use(authenticateRequest);

router.get('/', getFamilyMembers);
router.post('/', createFamilyMember);
router.get('/:id', getFamilyMemberById);
router.put('/:id', updateFamilyMember);
router.delete('/:id', deleteFamilyMember);

export default router;

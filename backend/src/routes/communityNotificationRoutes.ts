import { Router } from 'express';

import {
  createCommunityNotificationForAuthority,
  getCommunityNotificationDetails,
  listAuthorityCommunityNotifications,
  listResidentCommunityNotificationFeed,
  markCommunityNotificationAsRead,
  updateCommunityNotificationStatusForAuthority,
} from '../controllers/communityNotificationController.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateRequest);

router.post('/', createCommunityNotificationForAuthority);
router.get('/', listResidentCommunityNotificationFeed);
router.get('/manage', listAuthorityCommunityNotifications);
router.patch('/:id/status', updateCommunityNotificationStatusForAuthority);
router.post('/:id/read', markCommunityNotificationAsRead);
router.get('/:id', getCommunityNotificationDetails);

export default router;

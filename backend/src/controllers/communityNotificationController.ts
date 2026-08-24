import type { Request, Response } from 'express';

import {
  CommunityNotificationServiceError,
  createCommunityNotification,
  getCommunityNotificationById,
  listManagedCommunityNotifications,
  listResidentCommunityNotifications,
  markCommunityNotificationRead,
  updateCommunityNotificationStatus,
} from '../services/communityNotificationService.js';

function sendCommunityNotificationError(error: unknown, res: Response) {
  if (error instanceof CommunityNotificationServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  console.error('Community notification API error:', error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected community notification service error occurred.',
  });
}

function requireAuthenticatedUser(req: Request) {
  if (!req.authUser) {
    throw new CommunityNotificationServiceError(401, 'Authentication is required.');
  }

  return req.authUser;
}

function requireCommunityNotificationManager(req: Request) {
  const user = requireAuthenticatedUser(req);
  const role = String(user.role).toLowerCase();

  if (role !== 'admin' && role !== 'authority') {
    throw new CommunityNotificationServiceError(403, 'You are not authorized to manage community notifications.');
  }

  return user;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function createCommunityNotificationForAuthority(req: Request, res: Response) {
  try {
    const user = requireCommunityNotificationManager(req);
    const notification = await createCommunityNotification(user.id, req.body);

    return res.status(201).json({
      success: true,
      message: 'Community notification published successfully.',
      notification,
    });
  } catch (error) {
    return sendCommunityNotificationError(error, res);
  }
}

export async function listResidentCommunityNotificationFeed(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const notifications = await listResidentCommunityNotifications(user);

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    return sendCommunityNotificationError(error, res);
  }
}

export async function listAuthorityCommunityNotifications(req: Request, res: Response) {
  try {
    const user = requireCommunityNotificationManager(req);
    const notifications = await listManagedCommunityNotifications(user);

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    return sendCommunityNotificationError(error, res);
  }
}

export async function getCommunityNotificationDetails(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const notificationId = firstParam(req.params.id);

    if (!notificationId) {
      throw new CommunityNotificationServiceError(400, 'Invalid community notification id.');
    }

    const notification = await getCommunityNotificationById(notificationId, user);

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    return sendCommunityNotificationError(error, res);
  }
}

export async function markCommunityNotificationAsRead(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const notificationId = firstParam(req.params.id);

    if (!notificationId) {
      throw new CommunityNotificationServiceError(400, 'Invalid community notification id.');
    }

    const notification = await markCommunityNotificationRead(notificationId, user);

    return res.status(200).json({
      success: true,
      message: 'Community notification marked as read.',
      notification,
    });
  } catch (error) {
    return sendCommunityNotificationError(error, res);
  }
}

export async function updateCommunityNotificationStatusForAuthority(req: Request, res: Response) {
  try {
    const user = requireCommunityNotificationManager(req);
    const notificationId = firstParam(req.params.id);

    if (!notificationId) {
      throw new CommunityNotificationServiceError(400, 'Invalid community notification id.');
    }

    const notification = await updateCommunityNotificationStatus(notificationId, req.body, user);

    return res.status(200).json({
      success: true,
      message: 'Community notification status updated successfully.',
      notification,
    });
  } catch (error) {
    return sendCommunityNotificationError(error, res);
  }
}

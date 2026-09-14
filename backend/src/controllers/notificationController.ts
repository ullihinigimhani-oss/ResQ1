import type { Request, Response } from 'express';

import { AlertServiceError } from '../services/alertService.js';
import { registerResidentPushToken } from '../services/notificationService.js';

function sendNotificationError(error: unknown, res: Response) {
  if (error instanceof AlertServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  console.error('Notification API error:', error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected notification service error occurred.',
  });
}

function requireResident(req: Request) {
  const user = req.authUser;

  if (!user) {
    throw new AlertServiceError(401, 'Authentication is required.');
  }

  if (String(user.role).toLowerCase() !== 'resident') {
    throw new AlertServiceError(403, 'Push notifications are available for resident users only.');
  }

  return user;
}

export async function registerPushToken(req: Request, res: Response) {
  try {
    const user = requireResident(req);

    await registerResidentPushToken(user.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Push token registered successfully.',
    });
  } catch (error) {
    return sendNotificationError(error, res);
  }
}

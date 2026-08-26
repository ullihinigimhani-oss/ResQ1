import type { Request, Response } from 'express';

import { AlertServiceError } from '../services/alertService.js';
import {
  getAlertPreferencesForUser,
  updateAlertPreferencesForUser,
} from '../services/alertPreferenceService.js';

function sendPreferenceError(error: unknown, res: Response) {
  if (error instanceof AlertServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  console.error('Alert preferences API error:', error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected alert preferences service error occurred.',
  });
}

function requireResident(req: Request) {
  const user = req.authUser;

  if (!user) {
    throw new AlertServiceError(401, 'Authentication is required.');
  }

  if (String(user.role).toLowerCase() !== 'resident') {
    throw new AlertServiceError(403, 'Alert preferences are available for resident users only.');
  }

  return user;
}

export async function getMyAlertPreferences(req: Request, res: Response) {
  try {
    const user = requireResident(req);
    const preferences = await getAlertPreferencesForUser(user.id, user.preferredLanguage);

    return res.status(200).json({
      success: true,
      preferences,
    });
  } catch (error) {
    return sendPreferenceError(error, res);
  }
}

export async function updateMyAlertPreferences(req: Request, res: Response) {
  try {
    const user = requireResident(req);
    const preferences = await updateAlertPreferencesForUser(user.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Preferences saved successfully.',
      preferences,
    });
  } catch (error) {
    return sendPreferenceError(error, res);
  }
}

import type { Request, Response } from 'express';

import {
  AlertServiceError,
  createAlert,
  getActiveAlerts,
  getAlertHistory,
  getAlertById,
  updateAlert,
} from '../services/alertService.js';

const AUTHORIZED_ALERT_ROLES = new Set(['admin', 'authority']);

function sendAlertError(error: unknown, res: Response) {
  if (error instanceof AlertServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  console.error('Alert API error:', error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected alert service error occurred.',
  });
}

function requireAuthenticatedUser(req: Request) {
  if (!req.authUser) {
    throw new AlertServiceError(401, 'Authentication is required.');
  }

  return req.authUser;
}

function requireAlertPublisher(req: Request) {
  const user = requireAuthenticatedUser(req);

  if (!AUTHORIZED_ALERT_ROLES.has(String(user.role).toLowerCase())) {
    throw new AlertServiceError(403, 'You are not authorized to publish emergency alerts.');
  }

  return user;
}

function requireAlertManager(req: Request) {
  const user = requireAuthenticatedUser(req);

  if (!AUTHORIZED_ALERT_ROLES.has(String(user.role).toLowerCase())) {
    throw new AlertServiceError(403, 'You are not authorized to manage emergency alerts.');
  }

  return user;
}

export async function listActiveAlerts(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const alerts = await getActiveAlerts(user.location);

    return res.status(200).json({
      success: true,
      alerts,
    });
  } catch (error) {
    return sendAlertError(error, res);
  }
}

export async function listAlertHistory(req: Request, res: Response) {
  try {
    requireAuthenticatedUser(req);
    const alerts = await getAlertHistory();

    return res.status(200).json({
      success: true,
      alerts,
    });
  } catch (error) {
    return sendAlertError(error, res);
  }
}

export async function getEmergencyAlert(req: Request, res: Response) {
  try {
    requireAuthenticatedUser(req);
    const alertId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!alertId) {
      throw new AlertServiceError(400, 'Invalid alert id.');
    }

    const alert = await getAlertById(alertId);

    return res.status(200).json({
      success: true,
      alert,
    });
  } catch (error) {
    return sendAlertError(error, res);
  }
}

export async function createEmergencyAlert(req: Request, res: Response) {
  try {
    const user = requireAlertPublisher(req);
    const alert = await createAlert(user.id, req.body);

    return res.status(201).json({
      success: true,
      message: 'Emergency alert published successfully.',
      alert,
    });
  } catch (error) {
    return sendAlertError(error, res);
  }
}

export async function updateEmergencyAlert(req: Request, res: Response) {
  try {
    requireAlertManager(req);
    const alertId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!alertId) {
      throw new AlertServiceError(400, 'Invalid alert id.');
    }

    const alert = await updateAlert(alertId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Emergency alert updated successfully.',
      alert,
    });
  } catch (error) {
    return sendAlertError(error, res);
  }
}

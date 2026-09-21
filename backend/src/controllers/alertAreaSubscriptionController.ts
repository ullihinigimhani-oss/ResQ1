import type { Request, Response } from 'express';

import {
  AlertAreaSubscriptionServiceError,
  createAlertAreaSubscription,
  listAlertAreaSubscriptions,
  listAvailableAlertAreas,
  removeAlertAreaSubscription,
} from '../services/alertAreaSubscriptionService.js';

function sendAlertAreaError(error: unknown, res: Response) {
  if (error instanceof AlertAreaSubscriptionServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  console.error('Alert area subscription API error:', error);

  return res.status(500).json({
    success: false,
    message: 'Unable to process alert area subscriptions.',
  });
}

function requireResident(req: Request) {
  const user = req.authUser;

  if (!user) {
    throw new AlertAreaSubscriptionServiceError(401, 'Authentication is required.');
  }

  if (String(user.role).toLowerCase() !== 'resident') {
    throw new AlertAreaSubscriptionServiceError(403, 'Alert area subscriptions are available to residents only.');
  }

  return user;
}

function parseSubscriptionId(value: unknown) {
  const text = Array.isArray(value) ? value[0] : typeof value === 'string' ? value : '';

  if (!/^\d+$/.test(text.trim())) {
    return null;
  }

  const id = Number.parseInt(text, 10);
  return id > 0 ? id : null;
}

export async function getMyAlertAreaSubscriptions(req: Request, res: Response) {
  try {
    const user = requireResident(req);
    const subscriptions = await listAlertAreaSubscriptions(user.id);

    return res.status(200).json({ success: true, subscriptions });
  } catch (error) {
    return sendAlertAreaError(error, res);
  }
}

export async function getAvailableAlertAreas(req: Request, res: Response) {
  try {
    const user = requireResident(req);
    const areas = await listAvailableAlertAreas(user.location);

    return res.status(200).json({ success: true, areas });
  } catch (error) {
    return sendAlertAreaError(error, res);
  }
}

export async function subscribeToAlertArea(req: Request, res: Response) {
  try {
    const user = requireResident(req);
    const subscription = await createAlertAreaSubscription(user.id, req.body ?? {});

    return res.status(201).json({
      success: true,
      message: 'Alert area subscribed successfully.',
      subscription,
    });
  } catch (error) {
    return sendAlertAreaError(error, res);
  }
}

export async function unsubscribeFromAlertArea(req: Request, res: Response) {
  try {
    const user = requireResident(req);
    const subscriptionId = parseSubscriptionId(req.params.subscriptionId);

    if (subscriptionId === null) {
      throw new AlertAreaSubscriptionServiceError(400, 'Invalid alert area subscription ID.');
    }

    await removeAlertAreaSubscription(user.id, subscriptionId);

    return res.status(200).json({
      success: true,
      message: 'Alert area subscription removed.',
    });
  } catch (error) {
    return sendAlertAreaError(error, res);
  }
}

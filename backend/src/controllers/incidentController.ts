import type { Request, Response } from 'express';

import {
  createIncident,
  getAllIncidents,
  getIncidentById,
  getMyIncidents,
  IncidentServiceError,
  updateIncidentStatus as updateIncidentStatusService,
} from '../services/incidentService.js';

function sendIncidentError(error: unknown, res: Response) {
  if (error instanceof IncidentServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  console.error('Incident API error:', error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected incident service error occurred.',
  });
}

function requireAuthenticatedUser(req: Request) {
  if (!req.authUser) {
    throw new IncidentServiceError(401, 'Authentication is required.');
  }

  return req.authUser;
}

function requireIncidentManager(req: Request) {
  const user = requireAuthenticatedUser(req);

  if (user.role !== 'admin' && user.role !== 'authority') {
    throw new IncidentServiceError(403, 'You are not authorized to update incident status.');
  }

  return user;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function createIncidentReport(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incident = await createIncident(user.id, req.body);

    return res.status(201).json({
      success: true,
      message: 'Incident report submitted successfully.',
      incident,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function listMyIncidentReports(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incidents = await getMyIncidents(user.id);

    return res.status(200).json({
      success: true,
      incidents,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function getMyIncidentReport(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incidentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!incidentId) {
      throw new IncidentServiceError(400, 'Invalid incident id.');
    }

    const incident = await getIncidentById(user.id, incidentId);

    return res.status(200).json({
      success: true,
      incident,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function updateIncidentStatus(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incidentId = firstParam(req.params.id);

    if (!incidentId) {
      throw new IncidentServiceError(400, 'Invalid incident id.');
    }

    const incident = await updateIncidentStatusService(incidentId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Incident status updated successfully.',
      incident,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function listAllIncidents(req: Request, res: Response) {
  try {
    requireAuthenticatedUser(req);
    const incidents = await getAllIncidents();

    return res.status(200).json({
      success: true,
      incidents,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

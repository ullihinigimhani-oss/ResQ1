import type { Request, Response } from 'express';

import {
  createShelter,
  getShelterById,
  getShelterRoutes,
  getShelters,
  ShelterServiceError,
  updateShelter,
} from '../services/shelterService.js';

function sendShelterError(error: unknown, res: Response) {
  if (error instanceof ShelterServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  console.error('Shelter API error:', error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected shelter service error occurred.',
  });
}

function requireAuthenticatedUser(req: Request) {
  if (!req.authUser) {
    throw new ShelterServiceError(401, 'Authentication is required.');
  }

  return req.authUser;
}

function requireAuthorityUser(req: Request) {
  const user = requireAuthenticatedUser(req);

  if (user.role !== 'admin' && user.role !== 'authority') {
    throw new ShelterServiceError(403, 'You are not authorized to create shelters.');
  }

  return user;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function listSafeShelters(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const shelters = await getShelters(user.location);

    return res.status(200).json({
      success: true,
      shelters,
    });
  } catch (error) {
    return sendShelterError(error, res);
  }
}

export async function getSafeShelter(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const shelterId = firstParam(req.params.id);

    if (!shelterId) {
      throw new ShelterServiceError(400, 'Invalid shelter id.');
    }

    const shelter = await getShelterById(shelterId, user.location);

    return res.status(200).json({
      success: true,
      shelter,
    });
  } catch (error) {
    return sendShelterError(error, res);
  }
}

export async function listShelterEvacuationRoutes(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const shelterId = firstParam(req.params.id);

    if (!shelterId) {
      throw new ShelterServiceError(400, 'Invalid shelter id.');
    }

    const routes = await getShelterRoutes(shelterId, user.location);

    return res.status(200).json({
      success: true,
      routes,
    });
  } catch (error) {
    return sendShelterError(error, res);
  }
}

export async function createSafeShelter(req: Request, res: Response) {
  try {
    requireAuthorityUser(req);
    const shelter = await createShelter(req.body);

    return res.status(201).json({
      success: true,
      message: 'Safe shelter created successfully.',
      shelter,
    });
  } catch (error) {
    return sendShelterError(error, res);
  }
}

export async function updateSafeShelter(req: Request, res: Response) {
  try {
    requireAuthorityUser(req);
    const shelterId = firstParam(req.params.id);

    if (!shelterId) {
      throw new ShelterServiceError(400, 'Invalid shelter id.');
    }

    const shelter = await updateShelter(shelterId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Safe shelter updated successfully.',
      shelter,
    });
  } catch (error) {
    return sendShelterError(error, res);
  }
}

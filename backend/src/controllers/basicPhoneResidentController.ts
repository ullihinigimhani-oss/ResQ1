import type { Request, Response } from 'express';

import {
  BasicPhoneResidentServiceError,
  createBasicPhoneResident as createResident,
  deleteBasicPhoneResident as deleteResident,
  getBasicPhoneResident as getResident,
  listBasicPhoneResidents as listResidents,
  updateBasicPhoneResident as updateResident,
} from '../services/basicPhoneResidentService.js';
import { isCommunityMemberRole } from '../utils/roles.js';

function sendError(error: unknown, res: Response) {
  if (error instanceof BasicPhoneResidentServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  console.error('Basic phone resident API error:', error);

  return res.status(500).json({
    success: false,
    message: 'Unable to process basic phone residents right now.',
  });
}

function requireCommunityMember(req: Request) {
  const user = req.authUser;

  if (!user) {
    throw new BasicPhoneResidentServiceError(401, 'Authentication is required.');
  }

  if (!isCommunityMemberRole(user.role)) {
    throw new BasicPhoneResidentServiceError(
      403,
      'Basic phone resident management is available to Community Members only.',
    );
  }

  return user;
}

function parseResidentId(value: unknown) {
  const text = Array.isArray(value) ? value[0] : typeof value === 'string' ? value : '';

  if (!/^\d+$/.test(text.trim())) {
    return null;
  }

  const id = Number.parseInt(text, 10);
  return id > 0 ? id : null;
}

export async function getBasicPhoneResidents(req: Request, res: Response) {
  try {
    const user = requireCommunityMember(req);
    const residents = await listResidents(user.id);

    return res.status(200).json({ success: true, residents });
  } catch (error) {
    return sendError(error, res);
  }
}

export async function getBasicPhoneResident(req: Request, res: Response) {
  try {
    const user = requireCommunityMember(req);
    const residentId = parseResidentId(req.params.id);

    if (residentId === null) {
      throw new BasicPhoneResidentServiceError(400, 'Invalid basic phone resident ID.');
    }

    const resident = await getResident(user.id, residentId);
    return res.status(200).json({ success: true, resident });
  } catch (error) {
    return sendError(error, res);
  }
}

export async function createBasicPhoneResident(req: Request, res: Response) {
  try {
    const user = requireCommunityMember(req);
    const resident = await createResident(user.id, req.body ?? {});

    return res.status(201).json({
      success: true,
      message: 'Basic phone resident registered successfully.',
      resident,
    });
  } catch (error) {
    return sendError(error, res);
  }
}

export async function updateBasicPhoneResident(req: Request, res: Response) {
  try {
    const user = requireCommunityMember(req);
    const residentId = parseResidentId(req.params.id);

    if (residentId === null) {
      throw new BasicPhoneResidentServiceError(400, 'Invalid basic phone resident ID.');
    }

    const resident = await updateResident(user.id, residentId, req.body ?? {});
    return res.status(200).json({
      success: true,
      message: 'Basic phone resident updated successfully.',
      resident,
    });
  } catch (error) {
    return sendError(error, res);
  }
}

export async function deleteBasicPhoneResident(req: Request, res: Response) {
  try {
    const user = requireCommunityMember(req);
    const residentId = parseResidentId(req.params.id);

    if (residentId === null) {
      throw new BasicPhoneResidentServiceError(400, 'Invalid basic phone resident ID.');
    }

    await deleteResident(user.id, residentId);
    return res.status(200).json({
      success: true,
      message: 'Basic phone resident removed successfully.',
    });
  } catch (error) {
    return sendError(error, res);
  }
}

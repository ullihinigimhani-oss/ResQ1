import type { Request, Response } from 'express';

import { SOSServiceError, createSOSRequest, getActiveSOSRequests, getActiveSOSRequestsForVolunteer, respondToSOSRequest, getUserActiveSOSRequest, getVolunteerAcceptedSOSRequest, updateEvacuationStatus as updateEvacuationStatusService } from '../services/sosService.js';

function sendErrorResponse(error: unknown, res: Response) {
  if (error instanceof SOSServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred.',
  });
}

export async function createSOS(req: Request, res: Response): Promise<Response> {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  try {
    const result = await createSOSRequest(req.authUser.id, req.body);

    return res.status(201).json({
      success: true,
      message: 'SOS request created successfully.',
      request: result,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function getActiveSOS(req: Request, res: Response): Promise<Response> {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  try {
    const requests = await getActiveSOSRequests();

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function getActiveSOSForVolunteer(req: Request, res: Response): Promise<Response> {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  try {
    const requests = await getActiveSOSRequestsForVolunteer(req.authUser.id);

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function respondToSOS(req: Request, res: Response): Promise<Response> {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  const { requestId } = req.params;

  try {
    const result = await respondToSOSRequest(Number(requestId), req.authUser.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'SOS request responded successfully.',
      request: result,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function getUserSOSStatus(req: Request, res: Response): Promise<Response> {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  try {
    const request = await getUserActiveSOSRequest(req.authUser.id);

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function getVolunteerAcceptedSOS(req: Request, res: Response): Promise<Response> {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  try {
    const request = await getVolunteerAcceptedSOSRequest(req.authUser.id);

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function updateEvacuationStatus(req: Request, res: Response): Promise<Response> {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  const { requestId } = req.params;
  const { evacuationStatus } = req.body;

  if (!evacuationStatus || !['assistant_came', 'rescued', 'safe_shelter', 'still_in_disaster'].includes(evacuationStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid evacuation status.',
    });
  }

  try {
    const request = await updateEvacuationStatusService(Number(requestId), req.authUser.id, evacuationStatus);

    return res.status(200).json({
      success: true,
      message: 'Evacuation status updated successfully.',
      request,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

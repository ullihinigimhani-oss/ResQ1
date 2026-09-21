import type { Request, Response } from 'express';
import {
  createEmergencyContact as createContact,
  deleteEmergencyContact as deleteContact,
  EmergencyContactServiceError,
  getEmergencyContactById as getContactById,
  listEmergencyContactsByUserId as listContacts,
  updateEmergencyContact as updateContact,
} from '../services/emergencyContactService.js';

function parseContactId(paramValue: unknown): number | null {
  const str = Array.isArray(paramValue) ? paramValue[0] : typeof paramValue === 'string' ? paramValue : '';
  if (!str || !/^\d+$/.test(str.trim())) {
    return null;
  }
  const id = Number.parseInt(str.trim(), 10);
  return id > 0 ? id : null;
}

function sendErrorResponse(error: unknown, res: Response) {
  if (error instanceof EmergencyContactServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  console.error('Emergency Contact Controller error:', error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred while processing emergency contacts.',
  });
}

export async function getEmergencyContacts(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  try {
    const contacts = await listContacts(req.authUser.id);

    return res.status(200).json({
      success: true,
      count: contacts.length,
      contacts,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function getEmergencyContactById(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  const contactId = parseContactId(req.params.id);

  if (contactId === null) {
    return res.status(400).json({
      success: false,
      message: 'Invalid contact ID parameter.',
    });
  }

  try {
    const contact = await getContactById(req.authUser.id, contactId);

    return res.status(200).json({
      success: true,
      contact,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function createEmergencyContact(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  try {
    const contact = await createContact(req.authUser.id, req.body);

    return res.status(201).json({
      success: true,
      message: 'Emergency contact added successfully.',
      contact,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function updateEmergencyContact(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  const contactId = parseContactId(req.params.id);

  if (contactId === null) {
    return res.status(400).json({
      success: false,
      message: 'Invalid contact ID parameter.',
    });
  }

  try {
    const contact = await updateContact(req.authUser.id, contactId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Emergency contact updated successfully.',
      contact,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function deleteEmergencyContact(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  const contactId = parseContactId(req.params.id);

  if (contactId === null) {
    return res.status(400).json({
      success: false,
      message: 'Invalid contact ID parameter.',
    });
  }

  try {
    const result = await deleteContact(req.authUser.id, contactId);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

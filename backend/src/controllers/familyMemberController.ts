import type { Request, Response } from 'express';
import {
  createFamilyMember as createMember,
  deleteFamilyMember as deleteMember,
  FamilyMemberServiceError,
  getFamilyMemberById as getMemberById,
  listFamilyMembersByUserId as listMembers,
  updateFamilyMember as updateMember,
} from '../services/familyMemberService.js';

function parseMemberId(paramValue: unknown): number | null {
  const str = Array.isArray(paramValue) ? paramValue[0] : typeof paramValue === 'string' ? paramValue : '';
  if (!str || !/^\d+$/.test(str.trim())) {
    return null;
  }
  const id = Number.parseInt(str.trim(), 10);
  return id > 0 ? id : null;
}

function sendErrorResponse(error: unknown, res: Response) {
  if (error instanceof FamilyMemberServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  console.error('Family Member Controller error:', error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred while processing family member records.',
  });
}

export async function getFamilyMembers(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  try {
    const familyMembers = await listMembers(req.authUser.id);

    return res.status(200).json({
      success: true,
      count: familyMembers.length,
      familyMembers,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function getFamilyMemberById(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  const memberId = parseMemberId(req.params.id || '');

  if (memberId === null) {
    return res.status(400).json({
      success: false,
      message: 'Invalid family member ID parameter.',
    });
  }

  try {
    const familyMember = await getMemberById(req.authUser.id, memberId);

    return res.status(200).json({
      success: true,
      familyMember,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function createFamilyMember(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  try {
    const familyMember = await createMember(req.authUser.id, req.body);

    return res.status(201).json({
      success: true,
      message: 'Family member added successfully.',
      familyMember,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function updateFamilyMember(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  const memberId = parseMemberId(req.params.id || '');

  if (memberId === null) {
    return res.status(400).json({
      success: false,
      message: 'Invalid family member ID parameter.',
    });
  }

  try {
    const familyMember = await updateMember(req.authUser.id, memberId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Family member updated successfully.',
      familyMember,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function deleteFamilyMember(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  const memberId = parseMemberId(req.params.id || '');

  if (memberId === null) {
    return res.status(400).json({
      success: false,
      message: 'Invalid family member ID parameter.',
    });
  }

  try {
    const result = await deleteMember(req.authUser.id, memberId);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

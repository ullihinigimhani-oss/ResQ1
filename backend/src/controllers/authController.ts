import type { Request, Response } from 'express';

import {
  AuthServiceError,
  loginResident,
  registerResident,
  requestPasswordReset,
  resetPassword,
  updateResidentProfile,
  verifyResetOtp,
} from '../services/authService.js';

function sendErrorResponse(error: unknown, res: Response) {
  if (error instanceof AuthServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  console.error('Authentication error:', error);

  return res.status(500).json({
    success: false,
    message: 'An unexpected authentication error occurred.',
  });
}

export async function register(req: Request, res: Response) {
  try {
    const result = await registerResident(req.body);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please log in to continue.',
      user: result.user,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function login(req: Request, res: Response) {
  try {
    const result = await loginResident(req.body);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const result = await requestPasswordReset(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function verifyPasswordResetOtp(req: Request, res: Response) {
  try {
    const result = await verifyResetOtp(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
      resetToken: result.resetToken,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function resetAccountPassword(req: Request, res: Response) {
  try {
    const result = await resetPassword(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

export async function updateProfile(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  try {
    const result = await updateResidentProfile(req.authUser.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: result.user,
    });
  } catch (error) {
    return sendErrorResponse(error, res);
  }
}

import type { Request, Response } from 'express';

import { AuthServiceError, loginResident, registerResident } from '../services/authService.js';

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

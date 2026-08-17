import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { sql } from '../config/database.js';
import type { AuthenticatedUser } from '../types/auth.js';

type AuthTokenPayload = jwt.JwtPayload & {
  sub?: string;
  email?: string;
  role?: string;
};

function getBearerToken(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

export const authenticateRequest: RequestHandler = async (req, res, next) => {
  const token = getBearerToken(req.header('authorization'));

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET?.trim();

  if (!jwtSecret) {
    res.status(500).json({
      success: false,
      message: 'Authentication is not configured.',
    });
    return;
  }

  let payload: AuthTokenPayload;

  try {
    payload = jwt.verify(token, jwtSecret) as AuthTokenPayload;
  } catch {
    res.status(401).json({
      success: false,
      message: 'Your session has expired. Please log in again.',
    });
    return;
  }

  const userId = Number(payload.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({
      success: false,
      message: 'Invalid authentication session.',
    });
    return;
  }

  try {
    const rows = await sql`
      SELECT id, email, role
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    const user = rows[0] as AuthenticatedUser | undefined;

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Resident account was not found.',
      });
      return;
    }

    req.authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Authentication lookup error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to verify authentication.',
    });
  }
};

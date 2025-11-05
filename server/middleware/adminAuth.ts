import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { AppError, ErrorCode } from '../types/errors';

// Extend Express Request interface to include admin user
declare global {
  namespace Express {
    interface Request {
      adminUser?: {
        uid: string;
        email: string;
        admin: boolean;
        role: string;
      };
    }
  }
}

/**
 * Middleware to authenticate admin users
 * Verifies Firebase ID token and checks for admin claims
 */
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'No admin token provided',
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    const token = authHeader.split(' ')[1];

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Check if user has admin claims
    if (!decodedToken.admin || decodedToken.role !== 'admin') {
      throw new AppError(
        'Admin privileges required',
        ErrorCode.UNAUTHORIZED,
        403
      );
    }

    // Add admin user info to request
    req.adminUser = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      admin: decodedToken.admin,
      role: decodedToken.role,
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Invalid or expired admin token',
      code: ErrorCode.UNAUTHORIZED,
    });
  }
};

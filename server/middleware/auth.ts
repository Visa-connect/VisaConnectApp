import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        emailVerified: boolean;
        first_name?: string;
        last_name?: string;
        admin?: boolean;
      };
    }
  }
}

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authorization header must start with "Bearer "',
      });
    }

    // Extract the token
    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Invalid token format',
        message: 'Token is required after "Bearer "',
      });
    }

    try {
      // Try to verify as ID token first
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Add user info to request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        emailVerified: decodedToken.email_verified || false,
      };

      next();
    } catch (firebaseError: any) {
      console.error(
        'Firebase token verification failed:',
        firebaseError.message
      );

      // For now, let's try a different approach - check if we can extract user info from the token
      // This is a temporary solution until we implement proper token exchange
      try {
        // Try to decode the token as a JWT (without verification)
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(tokenParts[1], 'base64').toString()
          );

          // If this is a custom token, it should have a uid
          if (payload.uid) {
            // Get user info from Firebase
            const userRecord = await admin.auth().getUser(payload.uid);

            req.user = {
              uid: userRecord.uid,
              email: userRecord.email || '',
              emailVerified: userRecord.emailVerified || false,
            };

            next();
            return;
          }
        }
      } catch (decodeError) {
        console.error('Failed to decode token payload:', decodeError);
      }

      if (firebaseError.code === 'auth/id-token-expired') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Please log in again',
        });
      }

      if (firebaseError.code === 'auth/invalid-id-token') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Token is not valid',
        });
      }

      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid or expired token',
      });
    }
  } catch (error: any) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication service unavailable',
    });
  }
};

// Optional authentication - doesn't fail if no token provided
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];

      if (token) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(token);
          req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email || '',
            emailVerified: decodedToken.email_verified || false,
          };
        } catch (error) {
          // Token is invalid, but don't fail the request
          console.warn('Invalid token in optional auth:', error);
        }
      }
    }

    next();
  } catch (error) {
    // Don't fail the request for optional auth
    console.warn('Optional auth error:', error);
    next();
  }
};

// Check if user is email verified
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'User must be logged in',
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'Email not verified',
      message: 'Please verify your email address before proceeding',
    });
  }

  next();
};

import { Express, Request, Response } from 'express';
import {
  adminAuthServiceSimple,
  AdminLoginData,
} from '../services/adminAuthServiceSimple';
import { AppError, ErrorCode } from '../types/errors';

export default function adminAuthApi(app: Express): void {
  // Admin login endpoint
  app.post('/api/admin/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password }: AdminLoginData = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
          code: ErrorCode.VALIDATION_ERROR,
        });
      }

      // Use admin auth service for login
      const response = await adminAuthServiceSimple.loginAdmin({
        email,
        password,
      });
      res.json(response);
    } catch (error) {
      console.error('Admin login error:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
      });
    }
  });

  // Admin logout endpoint
  app.post('/api/admin/auth/logout', async (req: Request, res: Response) => {
    try {
      const response = await adminAuthServiceSimple.logoutAdmin();
      res.json(response);
    } catch (error) {
      console.error('Admin logout error:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Logout failed',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
      });
    }
  });

  // Verify admin token endpoint
  app.get('/api/admin/auth/verify', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
          code: ErrorCode.UNAUTHORIZED,
        });
      }

      const token = authHeader.split(' ')[1];

      // Use admin auth service for token verification
      const response = await adminAuthServiceSimple.verifyAdminToken(token);
      res.json(response);
    } catch (error) {
      console.error('Token verification error:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Token verification failed',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
      });
    }
  });
}

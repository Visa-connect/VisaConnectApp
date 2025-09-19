import { Express, Request, Response } from 'express';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { authenticateUser, requireEmailVerification } from '../middleware/auth';

export default function authApi(app: Express) {
  // User registration
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { password, ...userData } = req.body;

      if (!password || !userData.email) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Email and password are required',
        });
      }

      const result = await authService.registerUser({
        ...userData,
        password,
      });

      res.status(201).json({
        success: true,
        message: result.message || 'User registered successfully.',
        data: result.user,
        token: result.token,
      });
    } catch (error: any) {
      console.error('Registration error:', error);

      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          error: 'User already exists',
          message: 'A user with this email address already exists',
        });
      }

      res.status(500).json({
        error: 'Registration failed',
        message: error.message || 'Failed to create user account',
      });
    }
  });

  // Legacy endpoint - redirects to new user profile endpoint
  app.get(
    '/api/auth/me',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const user = await userService.getUserById(req.user!.uid);

        if (!user) {
          return res.status(404).json({
            error: 'User not found',
            message: 'User profile not found in database',
          });
        }

        res.json({
          success: true,
          data: user,
        });
      } catch (error: any) {
        console.error('Get profile error:', error);
        res.status(500).json({
          error: 'Failed to get profile',
          message:
            'This endpoint is deprecated. Please use /api/user/profile instead.',
          deprecated: true,
        });
      }
    }
  );

  // User login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Missing credentials',
          message: 'Email and password are required',
        });
      }

      const result = await authService.loginUser({ email, password });

      res.json({
        success: true,
        message: result.message || 'Login successful',
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      console.error('Login error:', error);

      if (error.message === 'Invalid email or password') {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
      }

      res.status(500).json({
        error: 'Login failed',
        message: error.message || 'Failed to authenticate user',
      });
    }
  });

  // Verify email
  app.post(
    '/api/auth/verify-email',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        await authService.verifyEmail(req.user!.uid);

        res.json({
          success: true,
          message: 'Email verified successfully',
        });
      } catch (error: any) {
        console.error('Email verification error:', error);
        res.status(500).json({
          error: 'Email verification failed',
          message: error.message || 'Failed to verify email',
        });
      }
    }
  );

  // Request password reset
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email required',
          message: 'Email address is required',
        });
      }

      await authService.resetPassword(email);

      res.json({
        success: true,
        message: 'Password reset email sent. Please check your inbox.',
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      res.status(500).json({
        error: 'Password reset failed',
        message: error.message || 'Failed to send password reset email',
      });
    }
  });

  // Protected route example (requires email verification)
  app.get(
    '/api/auth/protected',
    authenticateUser,
    requireEmailVerification,
    async (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'This is a protected route that requires email verification',
        user: req.user,
      });
    }
  );
}

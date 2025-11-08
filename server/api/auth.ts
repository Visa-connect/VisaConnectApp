import express, { Request, Response } from 'express';
import admin from 'firebase-admin';
import { authService } from '../services/authService';
import { isAuthenticated } from '../middleware/isAuthenticated';
import { isValidEmail } from '../utils/validation';

type FirebaseDecodedToken = admin.auth.DecodedIdToken & {
  user_id?: string;
  sub?: string;
};

const router = express.Router();

// Extend Request to include user added by isAuthenticated middleware
interface AuthenticatedRequest extends Request {
  user?: any;
}

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const result = await authService.registerUser(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed',
    });
  }
});

// Login existing user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const result = await authService.loginUser(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed',
    });
  }
});

// Refresh token endpoint
router.post(
  '/refresh-token',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
        });
      }

      const token = authHeader.split(' ')[1];
      let decodedToken: FirebaseDecodedToken | undefined;

      try {
        decodedToken = (await admin
          .auth()
          .verifyIdToken(token)) as FirebaseDecodedToken;
      } catch (error: any) {
        if (error?.code === 'auth/id-token-expired' && error?.claims) {
          decodedToken = error.claims as FirebaseDecodedToken;
        } else {
          throw error;
        }
      }

      const userId =
        decodedToken?.uid || decodedToken?.user_id || decodedToken?.sub;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const result = await authService.refreshToken(userId);

      res.json({
        success: result.success,
        token: result.token,
        user: result.user,
        message: result.message,
      });
    } catch (error: any) {
      console.error('Token refresh error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);

      if (
        error.name === 'AbortError' ||
        error.message === 'Token exchange timeout'
      ) {
        console.log('Request was aborted due to timeout');
        return res.status(408).json({
          success: false,
          message: 'Token refresh timed out. Please try again.',
        });
      }

      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        console.log('Network timeout or connection reset');
        return res.status(408).json({
          success: false,
          message: 'Network timeout. Please try again.',
        });
      }

      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please sign in again.',
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Token refresh failed',
      });
    }
  }
);

// Verify email
router.post(
  '/verify-email',
  isAuthenticated,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      await authService.verifyEmail(userId);
      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error: any) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Email verification failed',
      });
    }
  }
);

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    await authService.resetPassword(email);
    res.json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error: any) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Password reset failed',
    });
  }
});

// Initiate email change
router.post(
  '/change-email',
  isAuthenticated,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('📧 Email change request received:', {
        userId: req.user?.uid,
        newEmail: req.body.newEmail,
        hasPassword: !!req.body.password,
      });

      const { newEmail, password } = req.body;

      if (!newEmail || !password) {
        console.log('❌ Missing required fields:', {
          newEmail: !!newEmail,
          password: !!password,
        });
        return res.status(400).json({
          success: false,
          message: 'New email and password are required',
        });
      }

      // Validate email format
      if (!isValidEmail(newEmail)) {
        console.log('❌ Invalid email format:', newEmail);
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address',
        });
      }

      console.log(
        '✅ Validation passed, calling authService.initiateEmailChange...'
      );
      const result = await authService.initiateEmailChange(
        req.user!.uid,
        newEmail,
        password
      );
      console.log('✅ Email change initiated successfully:', result);
      res.json(result);
    } catch (error: any) {
      console.error('Email change initiation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to initiate email change',
      });
    }
  }
);

// Verify email change
router.post(
  '/verify-email-change',
  isAuthenticated,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { verificationToken } = req.body;

      if (!verificationToken) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
        });
      }

      const result = await authService.verifyEmailChange(
        req.user!.uid,
        verificationToken
      );
      res.json(result);
    } catch (error: any) {
      console.error('Email change verification error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify email change',
      });
    }
  }
);

export default router;

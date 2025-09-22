import express, { Request, Response } from 'express';
import { authService } from '../services/authService';
import { isAuthenticated } from '../middleware/isAuthenticated';

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

      // Generate a new custom token for the user
      const customToken = await authService.generateCustomToken(userId);

      // Exchange custom token for ID token with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const exchangeResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_WEB_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: customToken,
            returnSecureToken: true,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!exchangeResponse.ok) {
        const errorData = await exchangeResponse.json();
        console.error('Token exchange failed:', errorData);
        return res.status(500).json({
          success: false,
          message: 'Token refresh failed',
        });
      }

      const exchangeData = (await exchangeResponse.json()) as {
        idToken: string;
      };
      const idToken = exchangeData.idToken;

      res.json({
        success: true,
        token: idToken,
        message: 'Token refreshed successfully',
      });
    } catch (error: any) {
      console.error('Token refresh error:', error);

      if (error.name === 'AbortError') {
        return res.status(408).json({
          success: false,
          message: 'Token refresh timed out. Please try again.',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Token refresh failed',
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

export default router;

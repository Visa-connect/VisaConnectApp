import express, { Request, Response } from 'express';
import { authService } from '../services/authService';
import { isAuthenticated } from '../middleware/isAuthenticated';
import { isValidEmail } from '../utils/validation';

const router = express.Router();

// Extend Request to include user added by isAuthenticated middleware
interface AuthenticatedRequest extends Request {
  user?: any;
}

const REFRESH_TOKEN_COOKIE = 'vc_refresh_token';
const isProduction = process.env.NODE_ENV === 'production';

function parseCookies(
  cookieHeader: string | undefined
): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) {
      return acc;
    }
    acc[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
}

function getRefreshTokenFromRequest(req: Request): string | undefined {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[REFRESH_TOKEN_COOKIE];
}

function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function clearRefreshTokenCookie(res: Response) {
  res.cookie(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    expires: new Date(0),
    path: '/api/auth',
  });
}

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const result = await authService.registerUser(req.body);

    if (result.refreshToken) {
      setRefreshTokenCookie(res, result.refreshToken);
    }

    res.json({
      success: result.success,
      message: result.message,
      user: result.user,
      token: result.token,
    });
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

    if (!result.refreshToken) {
      console.warn('Login succeeded without refresh token.');
    } else {
      setRefreshTokenCookie(res, result.refreshToken);
    }

    res.json({
      success: result.success,
      message: result.message,
      user: result.user,
      token: result.token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed',
    });
  }
});

// Refresh token endpoint
router.post('/refresh-token', async (req: Request, res: Response) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token cookie missing',
      });
    }

    const result = await authService.refreshToken(refreshToken);

    setRefreshTokenCookie(res, result.refreshToken);

    res.json({
      success: result.success,
      token: result.token,
      user: result.user,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);

    if (error.message === 'Failed to refresh token') {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Token refresh failed. Please sign in again.',
      });
    }

    if (
      typeof error.message === 'string' &&
      error.message.toLowerCase().includes('refresh token')
    ) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        message: error.message || 'Token refresh failed. Please sign in again.',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Token refresh failed',
    });
  }
});

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

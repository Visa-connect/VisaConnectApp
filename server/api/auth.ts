import express, { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { authService } from '../services/authService';
import { isAuthenticated } from '../middleware/isAuthenticated';
import { isValidEmail } from '../utils/validation';
import { RefreshTokenError } from '../errors/AuthErrors';

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

    try {
      const key = decodeURIComponent(rawKey);
      const value = decodeURIComponent(rawValue.join('='));
      acc[key] = value;
    } catch (error) {
      console.warn(`Failed to decode cookie "${rawKey}"`, error);
      if (rawKey === REFRESH_TOKEN_COOKIE) {
        throw new RefreshTokenError('Malformed refresh token cookie');
      }
    }

    return acc;
  }, {});
}

function getRefreshTokenFromRequest(req: Request): string | undefined {
  try {
    const cookies = parseCookies(req.headers.cookie);
    return cookies[REFRESH_TOKEN_COOKIE];
  } catch (error) {
    if (error instanceof RefreshTokenError) {
      throw error;
    }
    throw new RefreshTokenError('Failed to parse refresh token cookie');
  }
}

function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
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
  const startTime = Date.now();
  const email = req.body?.email;

  try {
    // Validate request body
    if (!req.body || !email || !req.body.password) {
      const validationError = new Error('Email and password are required');
      console.error('Login validation error:', {
        email: email || 'missing',
        hasPassword: !!req.body?.password,
        path: req.path,
      });
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      const validationError = new Error('Invalid email format');
      console.error('Login validation error:', {
        email,
        path: req.path,
      });
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    // Set Sentry context for this request
    if (process.env.SENTRY_DSN) {
      Sentry.setUser({ email });
      Sentry.setContext('login_request', {
        email,
        path: req.path,
        method: req.method,
      });
    }

    const result = await authService.loginUser(req.body);

    if (!result.refreshToken) {
      console.warn('Login succeeded without refresh token.', { email });
    } else {
      setRefreshTokenCookie(res, result.refreshToken);
    }

    const duration = Date.now() - startTime;
    console.log('Login successful:', {
      email,
      duration: `${duration}ms`,
      userId: result.user?.id,
    });

    res.json({
      success: result.success,
      message: result.message,
      user: result.user,
      token: result.token,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error.message || 'Login failed';
    const isAuthError =
      errorMessage.includes('Invalid email or password') ||
      errorMessage.includes('Authentication failed');

    // Log structured error
    console.error('Login error:', {
      email,
      error: errorMessage,
      duration: `${duration}ms`,
      stack: error.stack,
      path: req.path,
    });

    // Capture error in Sentry (only for non-auth errors to avoid noise)
    if (process.env.SENTRY_DSN && !isAuthError) {
      Sentry.captureException(error, {
        tags: {
          endpoint: 'login',
          error_type: 'authentication',
        },
        extra: {
          email,
          duration: `${duration}ms`,
          path: req.path,
        },
      });
    }

    // Determine appropriate status code
    const statusCode = isAuthError ? 401 : 500;

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
    });
  }
});

// Refresh token endpoint
router.post('/refresh-token', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    // Validate refresh token exists
    if (!refreshToken || refreshToken.trim().length === 0) {
      console.error('Token refresh validation error:', {
        hasToken: !!refreshToken,
        tokenLength: refreshToken?.length || 0,
        path: req.path,
      });
      return res.status(401).json({
        success: false,
        message: 'Refresh token cookie missing',
      });
    }

    // Set Sentry context for this request
    if (process.env.SENTRY_DSN) {
      Sentry.setContext('refresh_token_request', {
        path: req.path,
        method: req.method,
        hasToken: true,
      });
    }

    const result = await authService.refreshToken(refreshToken);

    setRefreshTokenCookie(res, result.refreshToken);

    const duration = Date.now() - startTime;
    console.log('Token refresh successful:', {
      duration: `${duration}ms`,
      userId: result.user?.id,
      path: req.path,
    });

    res.json({
      success: result.success,
      token: result.token,
      user: result.user,
      message: result.message,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error.message || 'Token refresh failed';
    const isRefreshTokenError = error instanceof RefreshTokenError;

    // Log structured error
    console.error('Token refresh error:', {
      error: errorMessage,
      duration: `${duration}ms`,
      stack: error.stack,
      path: req.path,
      isRefreshTokenError,
    });

    // Capture error in Sentry (only for non-auth errors to avoid noise)
    if (process.env.SENTRY_DSN && !isRefreshTokenError) {
      Sentry.captureException(error, {
        tags: {
          endpoint: 'refresh-token',
          error_type: 'token_refresh',
        },
        extra: {
          duration: `${duration}ms`,
          path: req.path,
        },
      });
    }

    if (isRefreshTokenError) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        message: error.message || 'Token refresh failed. Please sign in again.',
      });
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
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

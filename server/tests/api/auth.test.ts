import express from 'express';
import request from 'supertest';
import { authService } from '../../services/authService';
import {
  RefreshTokenError,
  isAuthenticationError,
} from '../../errors/AuthErrors';
import * as Sentry from '@sentry/node';
import authRouter from '../../api/auth';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('@sentry/node');
jest.mock('firebase-admin');
jest.mock('../../errors/AuthErrors', () => ({
  ...jest.requireActual('../../errors/AuthErrors'),
  isAuthenticationError: jest.fn(),
}));

// Mock isAuthenticated middleware
jest.mock('../../middleware/isAuthenticated', () => {
  return {
    isAuthenticated: (req: any, res: any, next: any) => {
      // For testing, check if Authorization header exists
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }
      // Set user for authenticated requests
      req.user = { uid: 'test-uid-123' };
      next();
    },
  };
});

// Mock environment variables
process.env.SENTRY_DSN = 'test-sentry-dsn';
process.env.NODE_ENV = 'test';

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockSentry = Sentry as jest.Mocked<typeof Sentry>;
const mockIsAuthenticationError = isAuthenticationError as jest.MockedFunction<
  typeof isAuthenticationError
>;

describe('POST /api/auth/login', () => {
  const setupApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticationError.mockReturnValue(false);
  });

  const mockUser = {
    id: 'test-uid-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
  };

  it('should successfully login a user', async () => {
    const app = setupApp();

    mockAuthService.loginUser = jest.fn().mockResolvedValue({
      success: true,
      message: 'Login successful',
      user: mockUser,
      token: 'mock-id-token',
      refreshToken: 'mock-refresh-token',
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user).toEqual(mockUser);
    expect(response.body.token).toBe('mock-id-token');
    expect(response.get('Set-Cookie')?.[0]).toContain(
      'vc_refresh_token=mock-refresh-token'
    );
    expect(mockAuthService.loginUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should return 400 when email is missing', async () => {
    const app = setupApp();

    const response = await request(app).post('/api/auth/login').send({
      password: 'password123',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Email and password are required');
    expect(mockAuthService.loginUser).not.toHaveBeenCalled();
  });

  it('should return 400 when password is missing', async () => {
    const app = setupApp();

    const response = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Email and password are required');
    expect(mockAuthService.loginUser).not.toHaveBeenCalled();
  });

  it('should return 400 when email format is invalid', async () => {
    const app = setupApp();

    const response = await request(app).post('/api/auth/login').send({
      email: 'invalid-email',
      password: 'password123',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid email format');
    expect(mockAuthService.loginUser).not.toHaveBeenCalled();
  });

  it('should return 401 for authentication errors', async () => {
    const app = setupApp();

    mockAuthService.loginUser = jest
      .fn()
      .mockRejectedValue(new Error('Invalid email or password'));
    mockIsAuthenticationError.mockReturnValue(true);

    const response = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid email or password');
    expect(mockSentry.captureException).not.toHaveBeenCalled();
  });

  it('should return 500 for non-authentication errors', async () => {
    const app = setupApp();

    mockAuthService.loginUser = jest
      .fn()
      .mockRejectedValue(new Error('Database error'));
    mockIsAuthenticationError.mockReturnValue(false);

    const response = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Database error');
    expect(mockSentry.captureException).toHaveBeenCalled();
  });

  it('should set Sentry user context on login', async () => {
    const app = setupApp();

    mockAuthService.loginUser = jest.fn().mockResolvedValue({
      success: true,
      message: 'Login successful',
      user: mockUser,
      token: 'mock-id-token',
      refreshToken: 'mock-refresh-token',
    });

    await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(mockSentry.setUser).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
    expect(mockSentry.setContext).toHaveBeenCalledWith('login_request', {
      email: 'test@example.com',
      path: '/login',
      method: 'POST',
    });
  });

  it('should log warning when refresh token is missing', async () => {
    const app = setupApp();
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    mockAuthService.loginUser = jest.fn().mockResolvedValue({
      success: true,
      message: 'Login successful',
      user: mockUser,
      token: 'mock-id-token',
      // No refreshToken
    });

    await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Login succeeded without refresh token.',
      { email: 'test@example.com' }
    );

    consoleSpy.mockRestore();
  });
});

describe('POST /api/auth/register', () => {
  const setupApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    id: 'test-uid-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
  };

  it('should successfully register a new user', async () => {
    const app = setupApp();

    mockAuthService.registerUser = jest.fn().mockResolvedValue({
      success: true,
      message: 'User registered successfully',
      user: mockUser,
      token: 'mock-id-token',
      refreshToken: 'mock-refresh-token',
    });

    const response = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user).toEqual(mockUser);
    expect(response.body.token).toBe('mock-id-token');
    expect(response.get('Set-Cookie')?.[0]).toContain(
      'vc_refresh_token=mock-refresh-token'
    );
    expect(mockAuthService.registerUser).toHaveBeenCalled();
  });

  it('should handle registration errors', async () => {
    const app = setupApp();

    mockAuthService.registerUser = jest
      .fn()
      .mockRejectedValue(new Error('User already exists'));

    const response = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('User already exists');
  });

  it('should not set cookie when refresh token is missing', async () => {
    const app = setupApp();

    mockAuthService.registerUser = jest.fn().mockResolvedValue({
      success: true,
      message: 'User registered successfully',
      user: mockUser,
      token: 'mock-id-token',
      // No refreshToken
    });

    const response = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.get('Set-Cookie')).toBeUndefined();
  });
});

describe('POST /api/auth/refresh-token', () => {
  const setupApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    id: 'test-uid-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
  };

  it('should return 401 when refresh token cookie is missing', async () => {
    const app = setupApp();

    const response = await request(app)
      .post('/api/auth/refresh-token')
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/refresh token cookie missing/i);
    expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
  });

  it('should return 401 when refresh token is empty string', async () => {
    const app = setupApp();

    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', ['vc_refresh_token='])
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/refresh token cookie missing/i);
    expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
  });

  it('should return 401 when refresh token is whitespace only', async () => {
    const app = setupApp();

    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', ['vc_refresh_token=   '])
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/refresh token cookie missing/i);
    expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
  });

  it('should successfully refresh token when cookie is present', async () => {
    const app = setupApp();

    mockAuthService.refreshToken = jest.fn().mockResolvedValue({
      success: true,
      token: 'new-id-token',
      refreshToken: 'new-refresh-token',
      user: mockUser,
      message: 'Token refreshed successfully',
    });

    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', ['vc_refresh_token=old-refresh-token'])
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBe('new-id-token');
    expect(response.body.user).toEqual(mockUser);
    expect(response.get('Set-Cookie')?.[0]).toContain(
      'vc_refresh_token=new-refresh-token'
    );
    expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
      'old-refresh-token'
    );
  });

  it('should clear cookie and return 401 when RefreshTokenError is thrown', async () => {
    const app = setupApp();

    mockAuthService.refreshToken = jest
      .fn()
      .mockRejectedValue(new RefreshTokenError('Token refresh failed'));

    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', ['vc_refresh_token=stale-refresh-token'])
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Token refresh failed');
    expect(mockSentry.captureException).not.toHaveBeenCalled();

    const clearedCookie = response.get('Set-Cookie')?.[0];
    expect(clearedCookie).toBeDefined();
    expect(clearedCookie).toContain('vc_refresh_token=');
    expect(clearedCookie).toMatch(/expires=Thu, 01 Jan 1970 00:00:00 GMT/i);
  });

  it('should return 500 and capture in Sentry for non-RefreshTokenError', async () => {
    const app = setupApp();

    mockAuthService.refreshToken = jest
      .fn()
      .mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', ['vc_refresh_token=valid-refresh-token'])
      .send({});

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Database error');
    expect(mockSentry.captureException).toHaveBeenCalled();
  });

  it('should set Sentry context on refresh token request', async () => {
    const app = setupApp();

    mockAuthService.refreshToken = jest.fn().mockResolvedValue({
      success: true,
      token: 'new-id-token',
      refreshToken: 'new-refresh-token',
      user: mockUser,
      message: 'Token refreshed successfully',
    });

    await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', ['vc_refresh_token=old-refresh-token'])
      .send({});

    expect(mockSentry.setContext).toHaveBeenCalledWith(
      'refresh_token_request',
      {
        path: '/refresh-token',
        method: 'POST',
        hasToken: true,
      }
    );
  });
});

describe('POST /api/auth/verify-email', () => {
  const setupApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully verify email when authenticated', async () => {
    const app = setupApp();

    mockAuthService.verifyEmail = jest.fn().mockResolvedValue(undefined);

    const response = await request(app)
      .post('/api/auth/verify-email')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Email verified successfully');
    expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('test-uid-123');
  });

  it('should return 401 when user is not authenticated', async () => {
    const app = setupApp();

    const response = await request(app).post('/api/auth/verify-email').send({});

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/not authenticated/i);
    expect(mockAuthService.verifyEmail).not.toHaveBeenCalled();
  });

  it('should handle verification errors', async () => {
    const app = setupApp();

    mockAuthService.verifyEmail = jest
      .fn()
      .mockRejectedValue(new Error('Verification failed'));

    const response = await request(app)
      .post('/api/auth/verify-email')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Verification failed');
  });
});

describe('POST /api/auth/reset-password', () => {
  const setupApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully send password reset email', async () => {
    const app = setupApp();

    mockAuthService.resetPassword = jest.fn().mockResolvedValue(undefined);

    const response = await request(app).post('/api/auth/reset-password').send({
      email: 'test@example.com',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Password reset email sent');
    expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
      'test@example.com'
    );
  });

  it('should return 400 when email is missing', async () => {
    const app = setupApp();

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Email is required');
    expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
  });

  it('should handle password reset errors', async () => {
    const app = setupApp();

    mockAuthService.resetPassword = jest
      .fn()
      .mockRejectedValue(new Error('User not found'));

    const response = await request(app).post('/api/auth/reset-password').send({
      email: 'nonexistent@example.com',
    });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('User not found');
  });
});

describe('POST /api/auth/change-email', () => {
  const setupApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully initiate email change when authenticated', async () => {
    const app = setupApp();

    mockAuthService.initiateEmailChange = jest.fn().mockResolvedValue({
      success: true,
      message: 'Verification email sent',
    });

    const response = await request(app)
      .post('/api/auth/change-email')
      .set('Authorization', 'Bearer valid-token')
      .send({
        newEmail: 'new@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Verification email sent');
    expect(mockAuthService.initiateEmailChange).toHaveBeenCalledWith(
      'test-uid-123',
      'new@example.com',
      'password123'
    );
  });

  it('should return 401 when user is not authenticated', async () => {
    const app = setupApp();

    const response = await request(app).post('/api/auth/change-email').send({
      newEmail: 'new@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/not authenticated/i);
  });

  it('should return 400 when newEmail is missing', async () => {
    const app = setupApp();

    const response = await request(app)
      .post('/api/auth/change-email')
      .set('Authorization', 'Bearer valid-token')
      .send({
        password: 'password123',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('New email and password are required');
  });

  it('should return 400 when password is missing', async () => {
    const app = setupApp();

    const response = await request(app)
      .post('/api/auth/change-email')
      .set('Authorization', 'Bearer valid-token')
      .send({
        newEmail: 'new@example.com',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('New email and password are required');
  });

  it('should return 400 when email format is invalid', async () => {
    const app = setupApp();

    const response = await request(app)
      .post('/api/auth/change-email')
      .set('Authorization', 'Bearer valid-token')
      .send({
        newEmail: 'invalid-email',
        password: 'password123',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Please enter a valid email address');
  });

  it('should handle email change errors', async () => {
    const app = setupApp();

    mockAuthService.initiateEmailChange = jest
      .fn()
      .mockRejectedValue(new Error('Email already in use'));

    const response = await request(app)
      .post('/api/auth/change-email')
      .set('Authorization', 'Bearer valid-token')
      .send({
        newEmail: 'existing@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Email already in use');
  });
});

describe('POST /api/auth/verify-email-change', () => {
  const setupApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully verify email change when authenticated', async () => {
    const app = setupApp();

    mockAuthService.verifyEmailChange = jest.fn().mockResolvedValue({
      success: true,
      message: 'Email address has been successfully changed.',
    });

    const response = await request(app)
      .post('/api/auth/verify-email-change')
      .set('Authorization', 'Bearer valid-token')
      .send({
        verificationToken: '123456',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain(
      'Email address has been successfully changed'
    );
    expect(mockAuthService.verifyEmailChange).toHaveBeenCalledWith(
      'test-uid-123',
      '123456'
    );
  });

  it('should return 401 when user is not authenticated', async () => {
    const app = setupApp();

    const response = await request(app)
      .post('/api/auth/verify-email-change')
      .send({
        verificationToken: '123456',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/not authenticated/i);
  });

  it('should return 400 when verification token is missing', async () => {
    const app = setupApp();

    const response = await request(app)
      .post('/api/auth/verify-email-change')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Verification token is required');
  });

  it('should handle email change verification errors', async () => {
    const app = setupApp();

    mockAuthService.verifyEmailChange = jest
      .fn()
      .mockRejectedValue(new Error('Invalid verification token'));

    const response = await request(app)
      .post('/api/auth/verify-email-change')
      .set('Authorization', 'Bearer valid-token')
      .send({
        verificationToken: 'invalid-token',
      });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid verification token');
  });
});

describe('Cookie parsing and validation', () => {
  const setupApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    return app;
  };

  it('should handle malformed refresh token cookie', async () => {
    const app = setupApp();

    // Malformed cookie that can't be decoded
    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', ['vc_refresh_token=%E0%A4%A']) // Invalid UTF-8
      .send({});

    // Should either return 401 or handle gracefully
    expect([401, 500]).toContain(response.status);
  });

  it('should handle multiple cookies correctly', async () => {
    const app = setupApp();

    mockAuthService.refreshToken = jest.fn().mockResolvedValue({
      success: true,
      token: 'new-id-token',
      refreshToken: 'new-refresh-token',
      user: {
        id: 'test-uid-123',
        email: 'test@example.com',
      },
      message: 'Token refreshed successfully',
    });

    const response = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', [
        'other_cookie=value',
        'vc_refresh_token=valid-refresh-token',
        'another_cookie=value2',
      ])
      .send({});

    expect(response.status).toBe(200);
    expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
      'valid-refresh-token'
    );
  });
});

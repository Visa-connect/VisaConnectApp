import { AuthService } from '../../services/authService';
import { RefreshTokenError } from '../../errors/AuthErrors';
import admin from 'firebase-admin';
import pool from '../../db/config';
import { userService } from '../../services/userService';
import { emailService } from '../../services/emailService';
import { config } from '../../config/env';
import * as Sentry from '@sentry/node';

// Mock Firebase Admin - define mock methods inside the factory
jest.mock('firebase-admin', () => {
  // Create mock methods inside the factory (they're hoisted before the test file runs)
  const mockAuthMethods = {
    createUser: jest.fn(),
    createCustomToken: jest.fn(),
    getUser: jest.fn(),
    getUserByEmail: jest.fn(),
    updateUser: jest.fn(),
    generatePasswordResetLink: jest.fn(),
    generateEmailVerificationLink: jest.fn(),
    deleteUser: jest.fn(),
    verifyIdToken: jest.fn(),
  };

  return {
    __esModule: true,
    default: {
      auth: jest.fn(() => mockAuthMethods),
    },
    // Export mock methods so tests can access them
    __mockAuthMethods: mockAuthMethods,
  };
});

// Mock dependencies
jest.mock('../../db/config');
jest.mock('../../services/userService');
jest.mock('../../services/emailService');
jest.mock('../../config/env');
jest.mock('@sentry/node');

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment variables
process.env.SENTRY_DSN = 'test-sentry-dsn';
process.env.NODE_ENV = 'test';

const mockPool = pool as jest.Mocked<typeof pool>;
const mockUserService = userService as jest.Mocked<typeof userService>;
const mockEmailService = emailService as jest.Mocked<typeof emailService>;
const mockConfig = config as jest.Mocked<typeof config>;
const mockSentry = Sentry as jest.Mocked<typeof Sentry>;

// Get mock auth methods by calling admin.auth() which returns the mocked methods
// Since admin.auth() always returns the same mock object, we can use it directly
const getMockAuthMethods = () =>
  admin.auth() as any as {
    createUser: jest.Mock;
    createCustomToken: jest.Mock;
    getUser: jest.Mock;
    getUserByEmail: jest.Mock;
    updateUser: jest.Mock;
    generatePasswordResetLink: jest.Mock;
    generateEmailVerificationLink: jest.Mock;
    deleteUser: jest.Mock;
    verifyIdToken: jest.Mock;
  };

// Get the mock methods once - admin.auth() returns the same object every time
const mockAuthMethods = getMockAuthMethods();

describe('AuthService', () => {
  let authService: AuthService;

  const mockFirebaseUser = {
    uid: 'test-uid-123',
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: false,
  };

  const mockUser = {
    id: 'test-uid-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    visa_type: 'H1B',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAuthData = {
    localId: 'test-uid-123',
    idToken: 'mock-id-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();

    // Setup default mocks
    mockConfig.firebase = {
      webApiKey: 'test-web-api-key',
    } as any;

    // Reset all mock functions
    // Access mock methods via admin.auth() to ensure we have the latest reference
    const authMethods = getMockAuthMethods();
    Object.values(authMethods).forEach((mockFn) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockClear();
      }
    });

    (global.fetch as jest.Mock).mockReset();
  });

  describe('registerUser', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
      visa_type: 'H1B',
    };

    it('should successfully register a new user', async () => {
      // Mock Firebase Admin
      mockAuthMethods.createUser.mockResolvedValue(mockFirebaseUser);
      mockAuthMethods.createCustomToken.mockResolvedValue('custom-token');

      // Mock userService
      mockUserService.createUser = jest.fn().mockResolvedValue(mockUser);

      // Mock fetch for token exchange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          idToken: 'mock-id-token',
          refreshToken: 'mock-refresh-token',
        }),
      });

      const result = await authService.registerUser(registerData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('mock-id-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(mockAuthMethods.createUser).toHaveBeenCalledWith({
        email: registerData.email,
        password: registerData.password,
        displayName: 'Test User',
        emailVerified: false,
      });
      expect(mockUserService.createUser).toHaveBeenCalled();
    });

    it('should handle auto-login failure after registration', async () => {
      mockAuthMethods.createUser.mockResolvedValue(mockFirebaseUser);
      mockAuthMethods.createCustomToken.mockResolvedValue('custom-token');
      mockUserService.createUser = jest.fn().mockResolvedValue(mockUser);

      // Mock fetch for token exchange failure
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Token exchange failed',
      });

      const result = await authService.registerUser(registerData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBeUndefined();
      expect(result.message).toContain('Please log in');
    });

    it('should handle database unique constraint violation', async () => {
      mockAuthMethods.createUser.mockResolvedValue(mockFirebaseUser);
      mockAuthMethods.deleteUser.mockResolvedValue(undefined);
      mockUserService.createUser = jest.fn().mockRejectedValue({
        code: '23505', // PostgreSQL unique constraint violation
      });

      await expect(authService.registerUser(registerData)).rejects.toThrow(
        'User with this email already exists'
      );

      expect(mockAuthMethods.deleteUser).toHaveBeenCalledWith(
        registerData.email
      );
    });

    it('should handle registration errors', async () => {
      mockAuthMethods.createUser.mockRejectedValue(new Error('Firebase error'));

      await expect(authService.registerUser(registerData)).rejects.toThrow(
        'Firebase error'
      );
    });
  });

  describe('loginUser', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login a user', async () => {
      // Mock fetch for password verification
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          localId: 'test-uid-123',
        }),
      });

      // Mock Firebase Admin
      mockAuthMethods.createCustomToken.mockResolvedValue('custom-token');

      // Mock fetch for token exchange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          idToken: 'mock-id-token',
          refreshToken: 'mock-refresh-token',
        }),
      });

      // Mock userService
      mockUserService.getUserById = jest.fn().mockResolvedValue(mockUser);

      const result = await authService.loginUser(loginData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('mock-id-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(mockUserService.getUserById).toHaveBeenCalledWith('test-uid-123');
    });

    it('should throw error for invalid email or password', async () => {
      // Mock fetch for password verification failure
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: 'INVALID_PASSWORD',
          },
        }),
      });

      await expect(authService.loginUser(loginData)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw error when user not found in database', async () => {
      // Mock fetch for password verification
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          localId: 'test-uid-123',
        }),
      });

      // Mock Firebase Admin
      mockAuthMethods.createCustomToken.mockResolvedValue('custom-token');

      // Mock fetch for token exchange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          idToken: 'mock-id-token',
          refreshToken: 'mock-refresh-token',
        }),
      });

      // Mock userService to return null
      mockUserService.getUserById = jest.fn().mockResolvedValue(null);

      // The error gets caught and re-thrown as "Authentication failed"
      // because "Account incomplete" is not in the auth error list
      await expect(authService.loginUser(loginData)).rejects.toThrow(
        'Authentication failed'
      );
    });

    it('should capture non-auth errors in Sentry', async () => {
      // Mock fetch to throw network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(authService.loginUser(loginData)).rejects.toThrow();

      expect(mockSentry.captureException).toHaveBeenCalled();
    });

    it('should not capture auth errors in Sentry', async () => {
      // Mock fetch for password verification failure
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: 'INVALID_PASSWORD',
          },
        }),
      });

      await expect(authService.loginUser(loginData)).rejects.toThrow(
        'Invalid email or password'
      );

      expect(mockSentry.captureException).not.toHaveBeenCalled();
    });

    it('should handle token exchange failure', async () => {
      // Mock fetch for password verification
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          localId: 'test-uid-123',
        }),
      });

      // Mock Firebase Admin
      mockAuthMethods.createCustomToken.mockResolvedValue('custom-token');

      // Mock fetch for token exchange failure
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: 'Token exchange failed',
          },
        }),
      });

      await expect(authService.loginUser(loginData)).rejects.toThrow(
        'Authentication failed'
      );
    });

    it('should handle missing ID token in exchange response', async () => {
      // Mock fetch for password verification
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          localId: 'test-uid-123',
        }),
      });

      // Mock Firebase Admin
      mockAuthMethods.createCustomToken.mockResolvedValue('custom-token');

      // Mock fetch for token exchange without idToken
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          refreshToken: 'mock-refresh-token',
          // Missing idToken
        }),
      });

      await expect(authService.loginUser(loginData)).rejects.toThrow(
        'Authentication failed'
      );
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';

    it('should successfully refresh a token', async () => {
      // Mock fetch for token refresh
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id_token: 'new-id-token',
          refresh_token: 'new-refresh-token',
          user_id: 'test-uid-123',
        }),
      });

      // Mock userService
      mockUserService.getUserById = jest.fn().mockResolvedValue(mockUser);

      const result = await authService.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.token).toBe('new-id-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.user).toEqual(mockUser);
      expect(mockUserService.getUserById).toHaveBeenCalledWith('test-uid-123');
    });

    it('should throw RefreshTokenError when refresh fails', async () => {
      // Mock fetch for token refresh failure - ensure it returns a proper Response-like object
      const mockResponse = {
        ok: false,
        text: jest.fn().mockResolvedValue('Token refresh failed'),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        RefreshTokenError
      );
    });

    it('should throw RefreshTokenError when user not found', async () => {
      // Mock fetch for token refresh - use mockResolvedValue to allow multiple calls if needed
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id_token: 'new-id-token',
          refresh_token: 'new-refresh-token',
          user_id: 'test-uid-123',
        }),
      });

      // Mock userService to return null
      mockUserService.getUserById = jest.fn().mockResolvedValue(null);

      // Verify error type and message
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        RefreshTokenError
      );

      // Verify the specific error message
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw RefreshTokenError when response is missing required fields', async () => {
      // Mock fetch for token refresh with missing fields
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing id_token, refresh_token, or user_id
        }),
      });

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        RefreshTokenError
      );
    });

    it('should handle network errors during token refresh', async () => {
      // Mock fetch to throw network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        RefreshTokenError
      );
    });
  });

  describe('verifyEmail', () => {
    const uid = 'test-uid-123';

    it('should successfully verify email', async () => {
      mockAuthMethods.updateUser.mockResolvedValue(undefined);

      await authService.verifyEmail(uid);

      expect(mockAuthMethods.updateUser).toHaveBeenCalledWith(uid, {
        emailVerified: true,
      });
    });

    it('should throw error when verification fails', async () => {
      mockAuthMethods.updateUser.mockRejectedValue(new Error('Firebase error'));

      await expect(authService.verifyEmail(uid)).rejects.toThrow(
        'Failed to verify email'
      );
    });
  });

  describe('resetPassword', () => {
    const email = 'test@example.com';

    it('should successfully send password reset email', async () => {
      mockAuthMethods.generatePasswordResetLink.mockResolvedValue(
        'https://reset-link.com'
      );
      mockEmailService.sendPasswordResetEmail = jest
        .fn()
        .mockResolvedValue(true);

      await authService.resetPassword(email);

      expect(mockAuthMethods.generatePasswordResetLink).toHaveBeenCalledWith(
        email
      );
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      mockAuthMethods.generatePasswordResetLink.mockResolvedValue(
        'https://reset-link.com'
      );
      mockEmailService.sendPasswordResetEmail = jest
        .fn()
        .mockResolvedValue(false);

      await authService.resetPassword(email);

      expect(mockAuthMethods.generatePasswordResetLink).toHaveBeenCalledWith(
        email
      );
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should throw error when reset link generation fails', async () => {
      mockAuthMethods.generatePasswordResetLink.mockRejectedValue(
        new Error('Firebase error')
      );

      await expect(authService.resetPassword(email)).rejects.toThrow(
        'Failed to send password reset email'
      );
    });
  });

  describe('generateCustomToken', () => {
    const uid = 'test-uid-123';

    it('should successfully generate custom token', async () => {
      mockAuthMethods.createCustomToken.mockResolvedValue('custom-token');

      const result = await authService.generateCustomToken(uid);

      expect(result).toBe('custom-token');
      expect(mockAuthMethods.createCustomToken).toHaveBeenCalledWith(uid);
    });

    it('should throw error when token generation fails', async () => {
      mockAuthMethods.createCustomToken.mockRejectedValue(
        new Error('Firebase error')
      );

      await expect(authService.generateCustomToken(uid)).rejects.toThrow(
        'Failed to generate custom token'
      );
    });
  });

  describe('initiateEmailChange', () => {
    const uid = 'test-uid-123';
    const newEmail = 'newemail@example.com';
    const password = 'password123';

    it('should successfully initiate email change', async () => {
      mockAuthMethods.getUser.mockResolvedValue({
        uid,
        email: 'old@example.com',
      });
      mockAuthMethods.getUserByEmail.mockRejectedValue({
        code: 'auth/user-not-found',
      });
      mockEmailService.sendEmailChangeVerificationEmail = jest
        .fn()
        .mockResolvedValue(true);

      // Mock database pool
      mockPool.query = jest.fn().mockResolvedValue({
        rowCount: 1,
        rows: [],
      });

      const result = await authService.initiateEmailChange(
        uid,
        newEmail,
        password
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Verification email sent');
      expect(mockAuthMethods.getUser).toHaveBeenCalledWith(uid);
      expect(mockAuthMethods.getUserByEmail).toHaveBeenCalledWith(newEmail);
      expect(
        mockEmailService.sendEmailChangeVerificationEmail
      ).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should throw error when email is already in use', async () => {
      mockAuthMethods.getUser.mockResolvedValue({
        uid,
        email: 'old@example.com',
      });
      mockAuthMethods.getUserByEmail.mockResolvedValue({
        uid: 'other-uid',
        email: newEmail,
      });

      await expect(
        authService.initiateEmailChange(uid, newEmail, password)
      ).rejects.toThrow('Email address is already in use');
    });

    it('should throw error when user has no email', async () => {
      mockAuthMethods.getUser.mockResolvedValue({
        uid,
        email: null,
      });

      await expect(
        authService.initiateEmailChange(uid, newEmail, password)
      ).rejects.toThrow('No email found for user');
    });

    it('should throw error when email sending fails', async () => {
      mockAuthMethods.getUser.mockResolvedValue({
        uid,
        email: 'old@example.com',
      });
      mockAuthMethods.getUserByEmail.mockRejectedValue({
        code: 'auth/user-not-found',
      });
      mockEmailService.sendEmailChangeVerificationEmail = jest
        .fn()
        .mockResolvedValue(false);

      await expect(
        authService.initiateEmailChange(uid, newEmail, password)
      ).rejects.toThrow('Failed to send verification email');
    });

    it('should throw error when database update fails', async () => {
      mockAuthMethods.getUser.mockResolvedValue({
        uid,
        email: 'old@example.com',
      });
      mockAuthMethods.getUserByEmail.mockRejectedValue({
        code: 'auth/user-not-found',
      });
      mockEmailService.sendEmailChangeVerificationEmail = jest
        .fn()
        .mockResolvedValue(true);

      // Mock database pool to throw error
      mockPool.query = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        authService.initiateEmailChange(uid, newEmail, password)
      ).rejects.toThrow('Failed to store email change request in database');
    });
  });

  describe('verifyEmailChange', () => {
    const uid = 'test-uid-123';
    const verificationToken = '123456';

    it('should successfully verify and complete email change', async () => {
      mockAuthMethods.getUser.mockResolvedValue({
        uid,
        email: 'old@example.com',
      });
      mockAuthMethods.updateUser.mockResolvedValue(undefined);

      // Mock database pool
      // Success path: SELECT (get pending email) + UPDATE (set email and clear pending)
      mockPool.query = jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              pending_email: 'new@example.com',
              email_change_token: '123456',
              email_change_requested_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
        });

      mockEmailService.sendEmailChangeConfirmationEmail = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await authService.verifyEmailChange(
        uid,
        verificationToken
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain(
        'Email address has been successfully changed'
      );
      expect(mockAuthMethods.updateUser).toHaveBeenCalledWith(uid, {
        email: 'new@example.com',
        emailVerified: true,
      });
      // Success path executes 2 queries: SELECT + UPDATE
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(
        mockEmailService.sendEmailChangeConfirmationEmail
      ).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      // Mock database pool to return empty result
      mockPool.query = jest.fn().mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        authService.verifyEmailChange(uid, verificationToken)
      ).rejects.toThrow('User not found');
    });

    it('should throw error when no pending email change found', async () => {
      // Mock database pool
      mockPool.query = jest.fn().mockResolvedValueOnce({
        rows: [
          {
            pending_email: null,
            email_change_token: null,
            email_change_requested_at: null,
          },
        ],
      });

      await expect(
        authService.verifyEmailChange(uid, verificationToken)
      ).rejects.toThrow('No pending email change found');
    });

    it('should throw error when verification token does not match', async () => {
      // Mock database pool
      mockPool.query = jest.fn().mockResolvedValueOnce({
        rows: [
          {
            pending_email: 'new@example.com',
            email_change_token: 'wrong-token',
            email_change_requested_at: new Date(),
          },
        ],
      });

      await expect(
        authService.verifyEmailChange(uid, verificationToken)
      ).rejects.toThrow('Invalid verification token');
    });

    it('should throw error when token is expired', async () => {
      const expiredDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      // Mock database pool
      mockPool.query = jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              pending_email: 'new@example.com',
              email_change_token: '123456',
              email_change_requested_at: expiredDate,
            },
          ],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
        });

      await expect(
        authService.verifyEmailChange(uid, verificationToken)
      ).rejects.toThrow('Verification token has expired');
      expect(mockPool.query).toHaveBeenCalledTimes(2); // SELECT and cleanup UPDATE
    });
  });
});

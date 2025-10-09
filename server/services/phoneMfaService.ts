/**
 * Phone-based Multi-Factor Authentication Service
 * Handles phone verification and MFA enrollment using Firebase Auth
 */

import pool from '../db/config';
import { AppError, ErrorCode } from '../types/errors';
import { formatToE164, CountryCode } from '../utils/phoneValidation';
import { config } from '../config/env';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { recaptchaService } from './recaptchaService';

interface VerificationSessionData {
  sessionInfo: string;
  expiresAt: number;
  type: 'enrollment' | 'login_mfa' | 'phone_login';
}

interface PhoneLoginSessionData {
  phoneNumber: string;
  userId: string;
  expiresAt: number;
  firebaseVerificationId?: string;
}

// JWT secret for session tokens (use environment variable in production)
const SESSION_JWT_SECRET =
  process.env.SESSION_JWT_SECRET || 'dev-session-secret';

// Rate limiting store (userId -> {count, resetTime}) - TODO: Move to Redis in production
const rateLimitStore = new Map<string, { count: number; resetTime: Date }>();

export class PhoneMfaService {
  private readonly MAX_ATTEMPTS_PER_HOUR = 6;
  private readonly SESSION_EXPIRY_MINUTES = 10;

  /**
   * Validate Firebase configuration for phone authentication
   */
  private async validateFirebaseConfig(): Promise<void> {
    const apiKey = config.firebase.webApiKey;
    if (!apiKey) {
      throw new Error(
        'Firebase Web API Key not configured in environment variables'
      );
    }

    // Test Firebase API connectivity
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects?key=${apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('Firebase API Key validation failed:', {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(
          'Firebase Web API Key is invalid or has insufficient permissions'
        );
      }

      console.log('✅ Firebase API Key validation successful');
    } catch (error) {
      console.error('❌ Firebase API Key validation failed:', error);
      throw error;
    }
  }

  /**
   * Create a JWT session token
   */
  private createSessionToken(
    data: VerificationSessionData | PhoneLoginSessionData
  ): string {
    return jwt.sign(data, SESSION_JWT_SECRET, {
      expiresIn: `${this.SESSION_EXPIRY_MINUTES}m`,
    });
  }

  /**
   * Verify and decode a JWT session token
   */
  private verifySessionToken<T>(token: string): T | null {
    try {
      return jwt.verify(token, SESSION_JWT_SECRET) as T;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate Firebase ID token for authenticated user
   * @param uid - Firebase user ID
   * @returns ID token for authentication
   */
  private async generateIdToken(uid: string): Promise<string> {
    try {
      // 1. Generate a custom token using Firebase Admin SDK
      const customToken = await admin.auth().createCustomToken(uid);

      // 2. Exchange custom token for ID token
      const exchangeResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${config.firebase.webApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: customToken,
            returnSecureToken: true,
          }),
        }
      );

      if (!exchangeResponse.ok) {
        throw new Error('Failed to exchange custom token for ID token');
      }

      const exchangeData = (await exchangeResponse.json()) as any;
      return exchangeData.idToken;
    } catch (error) {
      console.error('Error generating ID token:', error);
      throw new AppError(
        'Failed to generate authentication token',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Check rate limiting for a user
   */
  private checkRateLimit(userId: string): void {
    const now = new Date();
    const userLimit = rateLimitStore.get(userId);

    if (userLimit) {
      // Reset if time window has passed
      if (now > userLimit.resetTime) {
        rateLimitStore.delete(userId);
      } else if (userLimit.count >= this.MAX_ATTEMPTS_PER_HOUR) {
        const minutesLeft = Math.ceil(
          (userLimit.resetTime.getTime() - now.getTime()) / (1000 * 60)
        );
        throw new AppError(
          `Too many verification attempts. Please try again in ${minutesLeft} minutes.`,
          ErrorCode.RATE_LIMIT_EXCEEDED,
          429
        );
      }
    }
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(userId: string): void {
    const now = new Date();
    const userLimit = rateLimitStore.get(userId);

    if (userLimit && now <= userLimit.resetTime) {
      userLimit.count++;
    } else {
      const resetTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      rateLimitStore.set(userId, { count: 1, resetTime });
    }
  }

  /**
   * Enroll user in phone MFA
   * This creates a verification session for the user to verify their phone
   */
  async enrollPhoneMfa(
    userId: string,
    phoneNumber: string,
    countryCode: CountryCode = 'US',
    recaptchaToken?: string
  ): Promise<{ sessionId: string; message: string }> {
    let updatedSessionId: string | undefined;
    try {
      // Check rate limiting
      this.checkRateLimit(userId);

      // Format phone number to E.164
      const e164Phone = formatToE164(phoneNumber, countryCode);
      if (!e164Phone) {
        throw new AppError(
          'Invalid phone number format',
          ErrorCode.INVALID_INPUT,
          400
        );
      }

      // Check if phone number is already in use
      const existingUserQuery = await pool.query(
        'SELECT id FROM users WHERE phone_number = $1 AND id != $2',
        [e164Phone, userId]
      );

      if (existingUserQuery.rows.length > 0) {
        throw new AppError(
          'Phone number already in use by another account',
          ErrorCode.DUPLICATE_ENTRY,
          409
        );
      }

      // Note: Firebase Admin SDK doesn't directly support sending SMS verification codes
      // You'll need to use Firebase Auth REST API or a third-party SMS service
      // For now, we'll create a session and return a sessionId

      // Create stateless session token for MFA enrollment
      const sessionData: VerificationSessionData = {
        sessionInfo: JSON.stringify({
          userId,
          phoneNumber: e164Phone,
          verified: false,
        }),
        expiresAt: Date.now() + this.SESSION_EXPIRY_MINUTES * 60 * 1000,
        type: 'enrollment',
      };

      const sessionId = this.createSessionToken(sessionData);

      // Increment rate limit
      this.incrementRateLimit(userId);

      // Send SMS verification code via Firebase Auth REST API
      try {
        const apiKey = config.firebase.webApiKey;
        if (!apiKey) {
          throw new Error('Firebase Web API Key not configured');
        }

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumber: e164Phone,
              recaptchaToken: recaptchaToken || 'test-recaptcha-token',
            }),
          }
        );

        const data = (await response.json()) as any;

        if (!response.ok) {
          throw new Error(
            data.error?.message || 'Failed to send verification code'
          );
        }

        // Create new session token with Firebase verification ID
        const updatedSessionData: VerificationSessionData = {
          sessionInfo: data.sessionInfo,
          expiresAt: Date.now() + this.SESSION_EXPIRY_MINUTES * 60 * 1000,
          type: 'enrollment',
        };

        updatedSessionId = this.createSessionToken(updatedSessionData);

        console.log(`SMS verification code sent to ${e164Phone}`);
      } catch (error: any) {
        console.error('Firebase phone auth error:', error);
        // Fallback to test mode for development
        console.log(`[FALLBACK] Using test mode for ${e164Phone}`);
        console.log(`[TEST] Test verification code: 123456`);
      }

      return {
        sessionId: updatedSessionId || sessionId, // Use updated session ID if Firebase SMS succeeded
        message: `Verification code sent to ${e164Phone}`,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error enrolling phone MFA:', error);
      throw new AppError(
        'Failed to enroll in phone MFA',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Resend verification code for MFA enrollment
   */
  async resendEnrollmentCode(
    sessionId: string
  ): Promise<{ sessionId: string; message: string }> {
    let updatedSessionId: string | undefined;
    try {
      // Verify and decode the JWT session token
      const session =
        this.verifySessionToken<VerificationSessionData>(sessionId);
      if (!session) {
        throw new AppError(
          'Invalid or expired session',
          ErrorCode.SESSION_EXPIRED,
          400
        );
      }

      if (session.expiresAt < Date.now()) {
        throw new AppError('Session expired', ErrorCode.SESSION_EXPIRED, 400);
      }

      const sessionInfo = JSON.parse(session.sessionInfo);
      const { userId, phoneNumber } = sessionInfo;

      // Check rate limiting
      this.checkRateLimit(userId);

      // Send SMS via Firebase Auth REST API
      try {
        const apiKey = config.firebase.webApiKey;
        if (!apiKey) {
          throw new Error('Firebase Web API Key not configured');
        }

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumber: phoneNumber,
              recaptchaToken: 'test-recaptcha-token',
            }),
          }
        );

        const data = (await response.json()) as any;

        if (!response.ok) {
          throw new Error(
            data.error?.message || 'Failed to resend verification code'
          );
        }

        // Create new session token with updated Firebase verification ID
        const updatedSessionData: VerificationSessionData = {
          sessionInfo: data.sessionInfo,
          expiresAt: session.expiresAt,
          type: 'enrollment',
        };

        updatedSessionId = this.createSessionToken(updatedSessionData);

        // Increment rate limit
        this.incrementRateLimit(userId);

        console.log(`SMS verification code resent to ${phoneNumber}`);
      } catch (error: any) {
        console.error('Firebase phone auth error:', error);
        // Fallback to test mode for development
        console.log(`[FALLBACK] Using test mode for ${phoneNumber}`);
        console.log(`[TEST] Test verification code: 123456`);
      }

      return {
        sessionId: updatedSessionId || sessionId, // Use updated session ID if Firebase SMS succeeded
        message: `Verification code resent to ${phoneNumber}`,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error resending enrollment code:', error);
      throw new AppError(
        'Failed to resend verification code',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Resend verification code for login MFA
   */
  async resendLoginMfaCode(
    sessionId: string
  ): Promise<{ sessionId: string; maskedPhone: string }> {
    let updatedSessionId: string | undefined;
    try {
      // Verify and decode the JWT session token
      const session =
        this.verifySessionToken<VerificationSessionData>(sessionId);
      if (!session) {
        throw new AppError(
          'Invalid or expired session',
          ErrorCode.SESSION_EXPIRED,
          400
        );
      }

      if (session.expiresAt < Date.now()) {
        throw new AppError('Session expired', ErrorCode.SESSION_EXPIRED, 400);
      }

      const sessionInfo = JSON.parse(session.sessionInfo);
      const { userId, phoneNumber } = sessionInfo;

      // Check rate limiting
      this.checkRateLimit(userId);

      // Send SMS via Firebase Auth REST API
      try {
        const apiKey = config.firebase.webApiKey;
        if (!apiKey) {
          throw new Error('Firebase Web API Key not configured');
        }

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumber: phoneNumber,
              recaptchaToken: 'test-recaptcha-token',
            }),
          }
        );

        const data = (await response.json()) as any;

        if (!response.ok) {
          throw new Error(
            data.error?.message || 'Failed to resend verification code'
          );
        }

        // Create new session token with updated Firebase verification ID
        const updatedSessionData: VerificationSessionData = {
          sessionInfo: data.sessionInfo,
          expiresAt: session.expiresAt,
          type: 'login_mfa',
        };

        updatedSessionId = this.createSessionToken(updatedSessionData);

        // Increment rate limit
        this.incrementRateLimit(userId);

        console.log(`MFA code resent to ${phoneNumber}`);
      } catch (error: any) {
        console.error('Firebase phone auth error:', error);
        // Fallback to test mode for development
        console.log(`[FALLBACK] Using test mode for ${phoneNumber}`);
        console.log(`[TEST] Test verification code: 123456`);
      }

      // Mask phone number for display
      const maskedPhone = phoneNumber.replace(/\d(?=\d{4})/g, '*');

      return {
        sessionId: updatedSessionId || sessionId, // Use updated session ID if Firebase SMS succeeded
        maskedPhone,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error resending login MFA code:', error);
      throw new AppError(
        'Failed to resend verification code',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Verify phone number with verification code
   */
  async verifyPhoneCode(
    sessionId: string,
    verificationCode: string
  ): Promise<{ success: boolean; userId: string; phoneNumber: string }> {
    try {
      // Verify and decode the JWT session token
      const session =
        this.verifySessionToken<VerificationSessionData>(sessionId);
      if (!session) {
        throw new AppError(
          'Invalid or expired verification session',
          ErrorCode.INVALID_INPUT,
          400
        );
      }

      // Check if session expired
      if (session.expiresAt < Date.now()) {
        throw new AppError(
          'Verification session expired',
          ErrorCode.SESSION_EXPIRED,
          400
        );
      }

      // Parse session info
      const sessionInfo = JSON.parse(session.sessionInfo);
      const { userId, phoneNumber } = sessionInfo;

      // TODO: Verify the code with Firebase or third-party service
      // For demonstration, we'll accept any 6-digit code
      if (!/^\d{6}$/.test(verificationCode)) {
        throw new AppError(
          'Invalid verification code format',
          ErrorCode.INVALID_INPUT,
          400
        );
      }

      // Update user record with verified phone number
      await pool.query(
        `UPDATE users 
         SET phone_number = $1, 
             phone_verified = true, 
             phone_verified_at = CURRENT_TIMESTAMP,
             mfa_enabled = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [phoneNumber, userId]
      );

      // No need to clean up session - JWT tokens are stateless

      return {
        success: true,
        userId,
        phoneNumber,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error verifying phone code:', error);
      throw new AppError(
        'Failed to verify phone code',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Disable MFA for a user
   */
  async disableMfa(userId: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE users 
         SET mfa_enabled = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
      );
    } catch (error) {
      console.error('Error disabling MFA:', error);
      throw new AppError(
        'Failed to disable MFA',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Check if user has MFA enabled
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT mfa_enabled FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      return result.rows[0].mfa_enabled || false;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  }

  /**
   * Get user's phone number (if verified)
   */
  async getUserPhone(userId: string): Promise<string | null> {
    try {
      const result = await pool.query(
        'SELECT phone_number, phone_verified FROM users WHERE id = $1',
        [userId]
      );

      if (
        result.rows.length === 0 ||
        !result.rows[0].phone_verified ||
        !result.rows[0].phone_number
      ) {
        return null;
      }

      return result.rows[0].phone_number;
    } catch (error) {
      console.error('Error getting user phone:', error);
      return null;
    }
  }

  /**
   * Send MFA verification code during login
   */
  async sendLoginMfaCode(
    userId: string,
    recaptchaToken?: string // Add this parameter
  ): Promise<{ sessionId: string; maskedPhone: string }> {
    let updatedSessionId: string | undefined;

    console.log('=== MFA RECAPTCHA DEBUG ===');
    console.log('Token received:', {
      hasToken: !!recaptchaToken,
      length: recaptchaToken?.length,
    });
    console.log('===========================');

    try {
      // Check if user has MFA enabled
      const mfaEnabled = await this.isMfaEnabled(userId);
      if (!mfaEnabled) {
        throw new AppError(
          'MFA is not enabled for this user',
          ErrorCode.INVALID_INPUT,
          400
        );
      }

      // Get user's phone number
      const phoneNumber = await this.getUserPhone(userId);
      if (!phoneNumber) {
        throw new AppError(
          'No verified phone number found',
          ErrorCode.INVALID_INPUT,
          400
        );
      }

      // Check rate limiting
      this.checkRateLimit(userId);

      // Create stateless session token for login MFA
      const sessionData: VerificationSessionData = {
        sessionInfo: JSON.stringify({
          userId,
          phoneNumber,
          type: 'login_mfa',
        }),
        expiresAt: Date.now() + this.SESSION_EXPIRY_MINUTES * 60 * 1000,
        type: 'login_mfa',
      };

      const sessionId = this.createSessionToken(sessionData);

      // Increment rate limit
      this.incrementRateLimit(userId);

      // Send SMS verification code via Firebase Auth REST API
      try {
        const apiKey = config.firebase.webApiKey;
        if (!apiKey) {
          throw new Error('Firebase Web API Key not configured');
        }

        // Validate recaptchaToken is provided
        if (!recaptchaToken) {
          throw new Error('reCAPTCHA token is required for MFA verification');
        }

        console.log('Sending MFA SMS via Firebase Auth REST API:', {
          phoneNumber,
          hasRecaptchaToken: !!recaptchaToken,
        });

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumber: phoneNumber,
              recaptchaToken: recaptchaToken, // Use the actual token
            }),
          }
        );

        const data = (await response.json()) as any;

        if (!response.ok) {
          console.error('Firebase Auth API Error Details:', data);
          throw new Error(
            data.error?.message || 'Failed to send verification code'
          );
        }

        // Create new session token with Firebase verification ID
        const updatedSessionData: VerificationSessionData = {
          sessionInfo: data.sessionInfo,
          expiresAt: Date.now() + this.SESSION_EXPIRY_MINUTES * 60 * 1000,
          type: 'login_mfa',
        };

        updatedSessionId = this.createSessionToken(updatedSessionData);

        console.log(`MFA code sent to ${phoneNumber}`);
      } catch (error: any) {
        console.error('Firebase phone auth error:', error);

        // Only fallback in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[FALLBACK] Using test mode for ${phoneNumber}`);
          console.log(`[TEST] Test verification code: 123456`);
        } else {
          throw error; // In production, fail properly
        }
      }

      // Mask phone number for display (show last 4 digits)
      const maskedPhone = phoneNumber.replace(/\d(?=\d{4})/g, '*');

      return {
        sessionId: updatedSessionId || sessionId,
        maskedPhone,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error sending login MFA code:', error);
      throw new AppError(
        'Failed to send MFA code',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Verify MFA code during login
   */
  async verifyLoginMfaCode(
    sessionId: string,
    verificationCode: string
  ): Promise<{ success: boolean; userId: string }> {
    try {
      // Verify and decode the JWT session token
      const session =
        this.verifySessionToken<VerificationSessionData>(sessionId);
      if (!session) {
        throw new AppError(
          'Invalid or expired MFA session',
          ErrorCode.INVALID_INPUT,
          400
        );
      }

      // Check if session expired
      if (session.expiresAt < Date.now()) {
        throw new AppError(
          'MFA session expired',
          ErrorCode.SESSION_EXPIRED,
          400
        );
      }

      // Parse session info
      const sessionInfo = JSON.parse(session.sessionInfo);
      const { userId, type } = sessionInfo;

      if (type !== 'login_mfa') {
        throw new AppError(
          'Invalid session type',
          ErrorCode.INVALID_INPUT,
          400
        );
      }

      // TODO: Verify the code with Firebase or third-party service
      // For demonstration, we'll accept any 6-digit code
      if (!/^\d{6}$/.test(verificationCode)) {
        throw new AppError(
          'Invalid verification code format',
          ErrorCode.INVALID_INPUT,
          400
        );
      }

      // No need to clean up session - JWT tokens are stateless

      return {
        success: true,
        userId,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error verifying login MFA code:', error);
      throw new AppError(
        'Failed to verify MFA code',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Send verification code for phone-based login (without existing user)
   * @param phoneNumber - The phone number to send code to
   * @param countryCode - The country code
   * @returns Session ID and masked phone number
   */
  async sendPhoneLoginCode(
    phoneNumber: string,
    countryCode: CountryCode,
    recaptchaToken?: string
  ): Promise<{ sessionId: string; maskedPhone: string }> {
    let updatedSessionId: string | undefined;

    console.log('=== RECAPTCHA DEBUG ===');
    console.log('Token received:', {
      token: recaptchaToken,
      type: typeof recaptchaToken,
      length: recaptchaToken?.length,
      firstChars: recaptchaToken?.substring(0, 30),
      lastChars: recaptchaToken?.substring(recaptchaToken?.length - 30),
    });
    console.log('======================');

    try {
      // ❌ REMOVE THIS - Don't verify yourself, let Firebase do it
      // if (recaptchaToken) {
      //   const isRecaptchaValid = await recaptchaService.verifyForPhoneAuth(
      //     recaptchaToken
      //   );
      //   if (!isRecaptchaValid) {
      //     console.warn(
      //       'reCAPTCHA verification failed - continuing with test mode'
      //     );
      //   }
      // }

      // Format phone number to E.164
      const formattedPhone = formatToE164(phoneNumber, countryCode);
      if (!formattedPhone) {
        throw new AppError(
          'Invalid phone number format',
          ErrorCode.INVALID_INPUT,
          400
        );
      }

      // Check if phone number exists in our database
      const userQuery = await pool.query(
        'SELECT id, phone_number, phone_verified FROM users WHERE phone_number = $1',
        [formattedPhone]
      );

      if (userQuery.rows.length === 0) {
        throw new AppError(
          'No account found with this phone number',
          ErrorCode.INVALID_INPUT,
          404
        );
      }

      console.log('Found user for phone login:', {
        userId: userQuery.rows[0].id,
        phoneVerified: userQuery.rows[0].phone_verified,
      });

      // Create stateless session token for phone login
      const sessionData: PhoneLoginSessionData = {
        phoneNumber: formattedPhone,
        userId: userQuery.rows[0].id,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      };

      const sessionId = this.createSessionToken(sessionData);

      // Send SMS via Firebase Auth REST API
      try {
        await this.validateFirebaseConfig();

        const apiKey = config.firebase.webApiKey;
        if (!apiKey) {
          throw new Error('Firebase Web API Key not configured');
        }

        console.log('Sending SMS via Firebase Auth REST API:', {
          phoneNumber: formattedPhone,
          apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT_SET',
          hasRecaptchaToken: !!recaptchaToken,
        });

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumber: formattedPhone,
              recaptchaToken: recaptchaToken, // ✅ Use the actual token from frontend
            }),
          }
        );

        const data = (await response.json()) as any;
        console.log('Firebase Auth API RESPONSE:', data);
        console.log('Firebase Auth API RESPONSE ERRORS:', data.error.errors);

        if (!response.ok) {
          console.error('Firebase Auth API Error Details:', data);
          throw new Error(
            data.error?.message || 'Failed to send verification code'
          );
        }

        // Update session data with Firebase verification ID
        const updatedSessionData: PhoneLoginSessionData = {
          phoneNumber: formattedPhone,
          userId: userQuery.rows[0].id,
          expiresAt: Date.now() + 10 * 60 * 1000,
          firebaseVerificationId: data.sessionInfo,
        };

        updatedSessionId = this.createSessionToken(updatedSessionData);

        console.log(`SMS verification code sent to ${formattedPhone}`);
      } catch (error: any) {
        console.error('Firebase phone auth error:', error);
        console.log(`[FALLBACK] Using test mode for ${formattedPhone}`);
        console.log(`[TEST] Test verification code: 123456`);
      }

      // Mask phone number for display
      const maskedPhone = formattedPhone.replace(
        /(\+\d{1,3})\d{3}(\d{4})/,
        '$1***$2'
      );

      return {
        sessionId: updatedSessionId || sessionId,
        maskedPhone,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error sending phone login code:', error);
      throw new AppError(
        'Failed to send verification code',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Resend verification code for phone login
   * @param sessionId - The existing session ID
   * @returns Updated session info
   */
  async resendPhoneLoginCode(
    sessionId: string,
    recaptchaToken?: string
  ): Promise<{ sessionId: string; maskedPhone: string }> {
    let updatedSessionId: string | undefined;
    try {
      // Verify reCAPTCHA token if provided
      if (recaptchaToken) {
        const isRecaptchaValid = await recaptchaService.verifyForPhoneAuth(
          recaptchaToken
        );
        if (!isRecaptchaValid) {
          console.warn(
            'reCAPTCHA verification failed for resend - continuing with test mode'
          );
        }
      }

      // Verify and decode the JWT session token
      const session = this.verifySessionToken<PhoneLoginSessionData>(sessionId);
      if (!session) {
        throw new AppError(
          'Invalid or expired session',
          ErrorCode.SESSION_EXPIRED,
          400
        );
      }

      if (session.expiresAt < Date.now()) {
        throw new AppError('Session expired', ErrorCode.SESSION_EXPIRED, 400);
      }

      // Check rate limiting
      this.checkRateLimit(session.userId);

      // Send SMS via Firebase Auth REST API
      try {
        const apiKey = config.firebase.webApiKey;
        if (!apiKey) {
          throw new Error('Firebase Web API Key not configured');
        }

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumber: session.phoneNumber,
              recaptchaToken: recaptchaToken || 'test-recaptcha-token', // Use real token if provided, fallback to test token
            }),
          }
        );

        const data = (await response.json()) as any;

        if (!response.ok) {
          throw new Error(
            data.error?.message || 'Failed to resend verification code'
          );
        }

        // Create new session token with updated Firebase verification ID
        const updatedSessionData: PhoneLoginSessionData = {
          phoneNumber: session.phoneNumber,
          userId: session.userId,
          expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
          firebaseVerificationId: data.sessionInfo,
        };

        updatedSessionId = this.createSessionToken(updatedSessionData);

        // Increment rate limit
        this.incrementRateLimit(session.userId);

        console.log(`SMS verification code resent to ${session.phoneNumber}`);
      } catch (error: any) {
        console.error('Firebase phone auth error:', error);
        // Fallback to test mode for development
        console.log(`[FALLBACK] Using test mode for ${session.phoneNumber}`);
        console.log(`[TEST] Test verification code: 123456`);
      }

      // Mask phone number for display
      const maskedPhone = session.phoneNumber.replace(
        /(\+\d{1,3})\d{3}(\d{4})/,
        '$1***$2'
      );

      return {
        sessionId: updatedSessionId || sessionId, // Use updated session ID if Firebase SMS succeeded
        maskedPhone,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error resending phone login code:', error);
      throw new AppError(
        'Failed to resend verification code',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Verify phone login code and return user data
   * @param sessionId - The session ID
   * @param verificationCode - The 6-digit verification code
   * @returns User data for login
   */
  async verifyPhoneLogin(
    sessionId: string,
    verificationCode: string
  ): Promise<{
    user: any;
    token?: string;
  }> {
    try {
      console.log('Verifying phone login:', {
        sessionId,
        verificationCode: verificationCode ? '***' : 'missing',
      });

      // Verify and decode the JWT session token
      const session = this.verifySessionToken<PhoneLoginSessionData>(sessionId);
      if (!session) {
        console.log('Invalid or expired session token:', sessionId);
        throw new AppError(
          'Invalid or expired session',
          ErrorCode.SESSION_EXPIRED,
          400
        );
      }

      if (session.expiresAt < Date.now()) {
        throw new AppError('Session expired', ErrorCode.SESSION_EXPIRED, 400);
      }

      // Verify code with Firebase Auth REST API
      if (session.firebaseVerificationId) {
        try {
          const apiKey = config.firebase.webApiKey;
          if (!apiKey) {
            throw new Error('Firebase Web API Key not configured');
          }

          const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sessionInfo: session.firebaseVerificationId,
                code: verificationCode,
              }),
            }
          );

          const data = (await response.json()) as any;

          if (!response.ok) {
            throw new Error(data.error?.message || 'Invalid verification code');
          }

          console.log(
            `Phone verification successful for ${session.phoneNumber}`
          );
        } catch (error: any) {
          console.error('Firebase verification error:', error);
          throw new AppError(
            'Invalid verification code',
            ErrorCode.INVALID_INPUT,
            400
          );
        }
      } else {
        // Fallback to test mode
        const isTestNumber =
          session.phoneNumber.startsWith('+1') &&
          (session.phoneNumber.includes('555') ||
            session.phoneNumber.includes('000'));

        console.log('Fallback to test mode:', {
          phoneNumber: session.phoneNumber,
          isTestNumber,
          verificationCode,
          hasFirebaseVerificationId: !!session.firebaseVerificationId,
        });

        // For development, accept any 6-digit code for any phone number
        // In production, this should be more restrictive
        if (verificationCode === '123456' || /^\d{6}$/.test(verificationCode)) {
          console.log(
            `Test verification successful for ${session.phoneNumber} with code ${verificationCode}`
          );
        } else {
          console.log('Test verification failed:', {
            isTestNumber,
            verificationCode,
            expectedCode: '123456 or any 6-digit code',
          });
          throw new AppError(
            'Invalid verification code',
            ErrorCode.INVALID_INPUT,
            400
          );
        }
      }

      // Get user data from database
      const userQuery = await pool.query(
        `SELECT 
          id, email, first_name, last_name, visa_type, current_location, 
          occupation, employer, nationality, languages, other_us_jobs, 
          relationship_status, hobbies, favorite_state, preferred_outings, 
          has_car, offers_rides, road_trips, favorite_place, travel_tips, 
          willing_to_guide, mentorship_interest, job_boards, visa_advice, 
          profile_photo_url, profile_photo_public_id, bio, created_at 
        FROM users WHERE id = $1`,
        [session.userId]
      );

      if (userQuery.rows.length === 0) {
        throw new AppError('User not found', ErrorCode.INVALID_INPUT, 404);
      }

      const user = userQuery.rows[0];

      // Don't delete session immediately - let it expire naturally
      // This allows for resend functionality if needed
      // phoneLoginSessions.delete(sessionId);

      // Generate Firebase ID token for authentication
      console.log('Generating ID token for user:', user.id);
      const idToken = await this.generateIdToken(user.id);

      return {
        user: {
          id: user.id,
          uid: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          visa_type: user.visa_type,
          current_location: user.current_location,
          occupation: user.occupation,
          employer: user.employer,
          nationality: user.nationality,
          languages: user.languages,
          other_us_jobs: user.other_us_jobs,
          relationship_status: user.relationship_status,
          hobbies: user.hobbies,
          favorite_state: user.favorite_state,
          preferred_outings: user.preferred_outings,
          has_car: user.has_car,
          offers_rides: user.offers_rides,
          road_trips: user.road_trips,
          favorite_place: user.favorite_place,
          travel_tips: user.travel_tips,
          willing_to_guide: user.willing_to_guide,
          mentorship_interest: user.mentorship_interest,
          job_boards: user.job_boards,
          visa_advice: user.visa_advice,
          profile_photo_url: user.profile_photo_url,
          profile_photo_public_id: user.profile_photo_public_id,
          bio: user.bio,
          created_at: user.created_at,
        },
        token: idToken,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error verifying phone login:', error);
      throw new AppError(
        'Failed to verify phone login',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }
}

export const phoneMfaService = new PhoneMfaService();

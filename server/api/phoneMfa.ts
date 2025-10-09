/**
 * Phone MFA API endpoints
 * Handles phone verification and multi-factor authentication
 */

import { Express, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { phoneMfaService } from '../services/phoneMfaService';
import { AppError, ErrorCode } from '../types/errors';
import { CountryCode } from '../utils/phoneValidation';

export default function phoneMfaApi(app: Express) {
  /**
   * POST /api/mfa/enroll
   * Enroll in phone-based MFA
   */
  app.post(
    '/api/mfa/enroll',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const { phoneNumber, countryCode, recaptchaToken } = req.body;

        if (!phoneNumber) {
          throw new AppError(
            'Phone number is required',
            ErrorCode.INVALID_INPUT,
            400
          );
        }

        const result = await phoneMfaService.enrollPhoneMfa(
          userId,
          phoneNumber,
          countryCode as CountryCode,
          recaptchaToken
        );

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        console.error('MFA enrollment error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
          success: false,
          error: error.message || 'Failed to enroll in MFA',
          errorCode: error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  /**
   * POST /api/mfa/verify
   * Verify phone number with verification code
   */
  app.post(
    '/api/mfa/verify',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const { sessionId, verificationCode } = req.body;

        if (!sessionId || !verificationCode) {
          throw new AppError(
            'Session ID and verification code are required',
            ErrorCode.INVALID_INPUT,
            400
          );
        }

        const result = await phoneMfaService.verifyPhoneCode(
          sessionId,
          verificationCode
        );

        res.json({
          success: true,
          data: result,
          message: 'Phone number verified successfully',
        });
      } catch (error: any) {
        console.error('Phone verification error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
          success: false,
          error: error.message || 'Failed to verify phone number',
          errorCode: error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  /**
   * POST /api/mfa/disable
   * Disable MFA for the authenticated user
   */
  app.post(
    '/api/mfa/disable',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        await phoneMfaService.disableMfa(userId);

        res.json({
          success: true,
          message: 'MFA disabled successfully',
        });
      } catch (error: any) {
        console.error('MFA disable error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
          success: false,
          error: error.message || 'Failed to disable MFA',
          errorCode: error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  /**
   * GET /api/mfa/status
   * Get MFA status for the authenticated user
   */
  app.get(
    '/api/mfa/status',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const mfaEnabled = await phoneMfaService.isMfaEnabled(userId);
        const phoneNumber = await phoneMfaService.getUserPhone(userId);

        // Mask phone number if present
        let maskedPhone = null;
        if (phoneNumber) {
          maskedPhone = phoneNumber.replace(/\d(?=\d{4})/g, '*');
        }

        res.json({
          success: true,
          data: {
            mfaEnabled,
            phoneNumber: maskedPhone,
          },
        });
      } catch (error: any) {
        console.error('MFA status error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
          success: false,
          error: error.message || 'Failed to get MFA status',
          errorCode: error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  /**
   * POST /api/mfa/send-login-code
   * Send MFA verification code during login
   * This is a public endpoint (no auth required) but requires valid session
   */
  app.post('/api/mfa/send-login-code', async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        throw new AppError('User ID is required', ErrorCode.INVALID_INPUT, 400);
      }

      const result = await phoneMfaService.sendLoginMfaCode(userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Send login MFA code error:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to send MFA code',
        errorCode: error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
      });
    }
  });

  /**
   * POST /api/mfa/verify-login-code
   * Verify MFA code during login
   * This is a public endpoint (no auth required)
   */
  app.post(
    '/api/mfa/verify-login-code',
    async (req: Request, res: Response) => {
      try {
        const { sessionId, verificationCode } = req.body;

        if (!sessionId || !verificationCode) {
          throw new AppError(
            'Session ID and verification code are required',
            ErrorCode.INVALID_INPUT,
            400
          );
        }

        const result = await phoneMfaService.verifyLoginMfaCode(
          sessionId,
          verificationCode
        );

        res.json({
          success: true,
          data: result,
          message: 'MFA verification successful',
        });
      } catch (error: any) {
        console.error('Verify login MFA code error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
          success: false,
          error: error.message || 'Failed to verify MFA code',
          errorCode: error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  /**
   * POST /api/auth/phone-login
   * Send verification code for phone-based login
   * This is a public endpoint (no auth required)
   */
  app.post('/api/auth/phone-login', async (req: Request, res: Response) => {
    try {
      const { phoneNumber, countryCode, recaptchaToken } = req.body;

      console.log('Phone login request:', { phoneNumber, countryCode });

      if (!phoneNumber) {
        throw new AppError(
          'Phone number is required',
          ErrorCode.INVALID_INPUT,
          400
        );
      }

      // Use the existing sendLoginMfaCode but adapt it for phone-only login
      // We'll need to modify the service to handle phone-based lookup
      const result = await phoneMfaService.sendPhoneLoginCode(
        phoneNumber,
        countryCode as CountryCode,
        recaptchaToken
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Phone login send code error:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to send verification code',
        errorCode: error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
      });
    }
  });

  /**
   * POST /api/auth/verify-phone-login
   * Verify phone number and complete login
   * This is a public endpoint (no auth required)
   */
  app.post(
    '/api/auth/verify-phone-login',
    async (req: Request, res: Response) => {
      try {
        const { sessionId, verificationCode } = req.body;

        console.log('Phone login verification request:', {
          sessionId,
          verificationCode: verificationCode ? '***' : 'missing',
        });

        if (!sessionId || !verificationCode) {
          console.log('Missing required fields:', {
            sessionId: !!sessionId,
            verificationCode: !!verificationCode,
          });
          throw new AppError(
            'Session ID and verification code are required',
            ErrorCode.INVALID_INPUT,
            400
          );
        }

        const result = await phoneMfaService.verifyPhoneLogin(
          sessionId,
          verificationCode
        );

        // Return response in the format expected by LoginResponse interface
        res.json({
          success: true,
          message: 'Phone login successful',
          user: result.user,
          token: result.token,
        });
      } catch (error: any) {
        console.error('Phone login verification error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
          success: false,
          error: error.message || 'Failed to verify phone login',
          errorCode: error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  /**
   * POST /api/auth/resend-phone-login-code
   * Resend verification code for phone login
   * This is a public endpoint (no auth required)
   */
  app.post(
    '/api/auth/resend-phone-login-code',
    async (req: Request, res: Response) => {
      try {
        const { sessionId, phoneNumber, countryCode, recaptchaToken } =
          req.body;

        console.log('Resend phone login code request:', {
          sessionId,
          phoneNumber,
          countryCode,
        });

        // If sessionId is provided, try to resend using existing session
        if (sessionId) {
          try {
            const result = await phoneMfaService.resendPhoneLoginCode(
              sessionId,
              recaptchaToken
            );
            res.json({
              success: true,
              data: result,
            });
            return;
          } catch (error: any) {
            // If session is invalid/expired, fall back to phone number method
            console.log(
              'Session-based resend failed, falling back to phone number method:',
              error.message
            );
          }
        }

        // Fallback: resend using phone number (create new session)
        if (!phoneNumber || !countryCode) {
          throw new AppError(
            'Phone number and country code are required when session is invalid',
            ErrorCode.INVALID_INPUT,
            400
          );
        }

        const result = await phoneMfaService.sendPhoneLoginCode(
          phoneNumber,
          countryCode as CountryCode,
          recaptchaToken
        );

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        console.error('Resend phone login code error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
          success: false,
          error: error.message || 'Failed to resend verification code',
          errorCode: error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  /**
   * POST /api/mfa/resend-enrollment-code
   * Resend verification code for MFA enrollment
   * This requires authentication
   */
  app.post(
    '/api/mfa/resend-enrollment-code',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.body;

        if (!sessionId) {
          throw new AppError(
            'Session ID is required',
            ErrorCode.INVALID_INPUT,
            400
          );
        }

        const result = await phoneMfaService.resendEnrollmentCode(sessionId);

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        console.error('Resend enrollment code error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
          success: false,
          error: error.message || 'Failed to resend verification code',
          errorCode: error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );

  /**
   * POST /api/mfa/resend-login-code
   * Resend verification code for login MFA
   * This is a public endpoint (no auth required)
   */
  app.post(
    '/api/mfa/resend-login-code',
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.body;

        if (!sessionId) {
          throw new AppError(
            'Session ID is required',
            ErrorCode.INVALID_INPUT,
            400
          );
        }

        const result = await phoneMfaService.resendLoginMfaCode(sessionId);

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        console.error('Resend login MFA code error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
          success: false,
          error: error.message || 'Failed to resend verification code',
          errorCode: error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );
}

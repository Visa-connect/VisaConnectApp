import * as Sentry from '@sentry/node';
import admin from 'firebase-admin';
import pool from '../db/config';
import { userService } from './userService';
import { User } from './userService';
import { config } from '../config/env';
import { emailService } from './emailService';
import { RefreshTokenError } from '../errors/AuthErrors';

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  token: string; // Firebase ID token for authenticated API calls - always present on successful login
  refreshToken?: string;
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  user: User;
  token?: string; // Optional for registration - may not be present if auto-login fails
  refreshToken?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string; // Required
  password: string; // Required
  first_name?: string;
  last_name?: string;
  visa_type?: string;
  current_location?: {
    city: string;
    state: string;
    country: string;
  };
  occupation?: string; // Job title/role
  employer?: string; // Company name
  timezone?: string; // User's timezone
}

export class AuthService {
  // Register a new user
  async registerUser(
    registerData: RegisterData
  ): Promise<RegistrationResponse> {
    try {
      // 1. Create Firebase user account
      const firebaseUser = await admin.auth().createUser({
        email: registerData.email,
        password: registerData.password,
        displayName: `${registerData.first_name || ''} ${
          registerData.last_name || ''
        }`.trim(),
        emailVerified: false, // Will be verified via email link
      });

      // 2. Create user profile in PostgreSQL with only essential fields
      const userProfile = await userService.createUser({
        id: firebaseUser.uid, // Use Firebase UID as PostgreSQL primary key
        email: registerData.email,
        first_name: registerData.first_name,
        last_name: registerData.last_name,
        visa_type: registerData.visa_type,
        current_location: registerData.current_location,
        occupation: registerData.occupation,
        employer: registerData.employer,
        timezone: registerData.timezone,
      });

      // 3. Automatically authenticate the user after registration
      const customToken = await admin
        .auth()
        .createCustomToken(firebaseUser.uid);

      // Exchange custom token for ID token
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
        console.error(
          'Auto-login after registration failed, but user was created successfully'
        );
        console.error('Response status:', exchangeResponse.status);
        console.error('Response text:', await exchangeResponse.text());
        return {
          success: true,
          message: 'User registered successfully. Please log in.',
          user: userProfile,
          // No token provided - user needs to log in manually
        };
      }

      const exchangeData = (await exchangeResponse.json()) as {
        idToken?: string;
        refreshToken?: string;
      };
      const idToken = exchangeData.idToken;

      if (!idToken) {
        throw new Error('Authentication failed');
      }

      // 4. Send email verification
      // await this.sendEmailVerification(firebaseUser.uid);

      return {
        success: true,
        message: 'User registered and logged in successfully.',
        user: userProfile,
        token: idToken, // Return the authentication token
        refreshToken: exchangeData.refreshToken,
      };
    } catch (error: any) {
      // If PostgreSQL creation fails, clean up Firebase user
      if (error.code === '23505') {
        // Unique constraint violation
        try {
          await admin.auth().deleteUser(registerData.email);
        } catch (cleanupError) {
          console.error('Failed to cleanup Firebase user:', cleanupError);
        }
        throw new Error('User with this email already exists');
      }

      throw error;
    }
  }

  // Login existing user
  async loginUser(loginData: LoginData): Promise<AuthResponse> {
    try {
      // 1. Verify password using Firebase Auth REST API
      const verifyPasswordResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.firebase.webApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: loginData.email,
            password: loginData.password,
            returnSecureToken: true,
          }),
        }
      );

      if (!verifyPasswordResponse.ok) {
        const errorData = (await verifyPasswordResponse.json()) as any;
        if (
          errorData.error?.message?.includes('INVALID_PASSWORD') ||
          errorData.error?.message?.includes('EMAIL_NOT_FOUND')
        ) {
          throw new Error('Invalid email or password');
        }
        throw new Error('Authentication failed');
      }

      const authData = (await verifyPasswordResponse.json()) as any;
      const firebaseUid = authData.localId;

      // MFA check removed - phone verification disabled

      // 3. Generate a custom token using Firebase Admin SDK
      const customToken = await admin.auth().createCustomToken(firebaseUid);

      // 3. Exchange custom token for ID token
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
        const errorData = (await exchangeResponse.json()) as any;
        console.error('Token exchange failed:', errorData);
        throw new Error('Authentication failed');
      }

      const exchangeData = (await exchangeResponse.json()) as {
        idToken?: string;
        refreshToken?: string;
      };
      const idToken = exchangeData.idToken; // Firebase ID token

      if (!idToken) {
        throw new Error('Authentication failed');
      }

      // 4. Get user profile from PostgreSQL
      const userProfile = await userService.getUserById(firebaseUid);

      if (!userProfile) {
        // User exists in Firebase but not in PostgreSQL - this shouldn't happen
        // If it does, the user needs to complete registration or there's a data inconsistency
        console.error(
          'User exists in Firebase but not in PostgreSQL. UID:',
          firebaseUid
        );
        throw new Error(
          'Account incomplete. Please complete your registration or contact support.'
        );
      }

      return {
        success: true,
        message: 'Login successful',
        user: userProfile,
        token: idToken,
        refreshToken: exchangeData.refreshToken,
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Authentication failed';
      const isAuthError = errorMessage === 'Invalid email or password';

      // Log structured error
      console.error('authService.loginUser ERROR:', {
        message: errorMessage,
        stack: error.stack,
        email: loginData.email,
        isAuthError,
      });

      // Capture error in Sentry (only for non-auth errors to avoid noise)
      if (process.env.SENTRY_DSN && !isAuthError) {
        Sentry.captureException(error, {
          tags: {
            service: 'authService',
            method: 'loginUser',
            error_type: 'authentication',
          },
          extra: {
            email: loginData.email,
            errorMessage,
          },
        });
      }

      // Re-throw auth errors as-is
      if (isAuthError) {
        throw error;
      }

      // For other errors, throw generic message but log original
      throw new Error('Authentication failed');
    }
  }

  // Send email verification
  private async sendEmailVerification(uid: string): Promise<void> {
    try {
      const verificationLink = await admin
        .auth()
        .generateEmailVerificationLink(uid);

      // In production, you'd send this via your email service
      // For now, we'll just log it
      console.log('Email verification link:', verificationLink);

      // You can integrate with services like SendGrid, AWS SES, etc.
      // await emailService.sendVerificationEmail(email, verificationLink);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email sending fails
    }
  }

  // Verify email
  async verifyEmail(uid: string): Promise<void> {
    try {
      await admin.auth().updateUser(uid, { emailVerified: true });

      // Update PostgreSQL user as well
      // Note: emailVerified is managed by Firebase, not stored in PostgreSQL
      console.log('Email verified for user:', uid);
    } catch (error) {
      throw new Error('Failed to verify email');
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<void> {
    try {
      const resetLink = await admin.auth().generatePasswordResetLink(email);

      console.log('📧 Password reset request details:');
      console.log('  To:', email);
      console.log(
        '  From:',
        config.email.fromEmail || 'noreply@visaconnect.com'
      );
      console.log('  Subject: Password Reset - VisaConnect');
      console.log('  Reset Link:', resetLink);

      // Send the password reset email
      const emailSent = await emailService.sendPasswordResetEmail(
        email,
        resetLink
      );

      if (!emailSent) {
        console.warn(
          '⚠️ Password reset email failed to send, but link was generated'
        );
        // Still log the link for development purposes
        console.log('Password reset link for manual use:', resetLink);
      }
    } catch (error) {
      console.error('❌ Password reset error:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Generate custom token for token refresh
  async generateCustomToken(uid: string): Promise<string> {
    try {
      return await admin.auth().createCustomToken(uid);
    } catch (error) {
      throw new Error('Failed to generate custom token');
    }
  }

  // Refresh user token
  async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    token: string;
    refreshToken: string;
    user: User;
    message: string;
  }> {
    try {
      const refreshResponse = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${config.firebase.webApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }).toString(),
        }
      );

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Token refresh exchange failed:', errorText);
        throw new RefreshTokenError('Token refresh failed');
      }

      const refreshData = (await refreshResponse.json()) as {
        id_token?: string;
        refresh_token?: string;
        user_id?: string;
      };

      const newIdToken = refreshData.id_token;
      const newRefreshToken = refreshData.refresh_token;
      const userId = refreshData.user_id;

      if (!newIdToken || !newRefreshToken || !userId) {
        throw new RefreshTokenError('Token refresh failed');
      }

      const userProfile = await userService.getUserById(userId);
      if (!userProfile) {
        throw new RefreshTokenError('User not found');
      }

      return {
        success: true,
        token: newIdToken,
        refreshToken: newRefreshToken,
        user: userProfile,
        message: 'Token refreshed successfully',
      };
    } catch (error: unknown) {
      console.error('Token refresh error:', error);

      if (error instanceof RefreshTokenError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : undefined;
      throw new RefreshTokenError(message);
    }
  }

  // Initiate email change
  async initiateEmailChange(
    uid: string,
    newEmail: string,
    password: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get user info
      const user = await admin.auth().getUser(uid);
      if (!user.email) {
        throw new Error('No email found for user');
      }

      // Note: We'll skip password verification for now since Firebase Admin SDK
      // doesn't have a direct way to verify passwords. The password will be
      // verified on the frontend before calling this function.
      console.log(
        `📧 Initiating email change for user ${uid}: ${user.email} -> ${newEmail}`
      );

      // Check if new email is already in use
      console.log(`🔍 Checking if email ${newEmail} is available...`);
      try {
        await admin.auth().getUserByEmail(newEmail);
        throw new Error('Email address is already in use');
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          console.log(`✅ Email ${newEmail} is available`);
        } else {
          throw error;
        }
      }

      // Generate a simple verification code (6 digits)
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      console.log(`🔑 Generated verification code: ${verificationCode}`);

      // Send verification email to new address
      console.log(`📤 Sending verification email to ${newEmail}...`);
      const emailSent = await emailService.sendEmailChangeVerificationEmail(
        newEmail,
        verificationCode
      );

      if (!emailSent) {
        console.error(`❌ Failed to send verification email to ${newEmail}`);
        throw new Error('Failed to send verification email');
      }
      console.log(`✅ Verification email sent successfully to ${newEmail}`);

      // Store pending email change in database
      console.log(`💾 Storing pending email change in database...`);
      try {
        const result = await pool.query(
          'UPDATE users SET pending_email = $1, email_change_token = $2, email_change_requested_at = NOW() WHERE id = $3',
          [newEmail, verificationCode, uid]
        );
        console.log(
          `✅ Pending email change stored in database. Rows affected: ${result.rowCount}`
        );
      } catch (dbError) {
        console.error(`❌ Database error storing email change:`, dbError);
        throw new Error('Failed to store email change request in database');
      }

      console.log(
        `📧 Email change initiated for user ${uid}: ${user.email} -> ${newEmail}`
      );

      return {
        success: true,
        message:
          'Verification email sent to your new email address. Please check your inbox and click the verification link.',
      };
    } catch (error: any) {
      console.error('❌ Email change initiation error:', error);
      throw new Error(error.message || 'Failed to initiate email change');
    }
  }

  // Verify and complete email change
  async verifyEmailChange(
    uid: string,
    verificationToken: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get user's pending email change from database
      const result = await pool.query(
        'SELECT pending_email, email_change_token, email_change_requested_at FROM users WHERE id = $1',
        [uid]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const { pending_email, email_change_token, email_change_requested_at } =
        result.rows[0];

      if (!pending_email || !email_change_token) {
        throw new Error('No pending email change found');
      }

      // Check if verification token matches
      if (verificationToken !== email_change_token) {
        throw new Error('Invalid verification token');
      }

      // Check if token is expired (24 hours)
      const tokenAge =
        Date.now() - new Date(email_change_requested_at).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (tokenAge > maxAge) {
        // Clean up expired token
        await pool.query(
          'UPDATE users SET pending_email = NULL, email_change_token = NULL, email_change_requested_at = NULL WHERE id = $1',
          [uid]
        );
        throw new Error(
          'Verification token has expired. Please request a new email change.'
        );
      }

      // Get current user email for notification
      const user = await admin.auth().getUser(uid);
      const oldEmail = user.email || '';

      // Update email in Firebase Auth
      await admin.auth().updateUser(uid, {
        email: pending_email,
        emailVerified: true,
      });

      // Update email in database
      await pool.query(
        'UPDATE users SET email = $1, pending_email = NULL, email_change_token = NULL, email_change_requested_at = NULL WHERE id = $2',
        [pending_email, uid]
      );

      // Send confirmation email to new address
      await emailService.sendEmailChangeConfirmationEmail(
        pending_email,
        oldEmail
      );

      console.log(
        `✅ Email change completed for user ${uid}: ${oldEmail} -> ${pending_email}`
      );

      return {
        success: true,
        message: 'Email address has been successfully changed.',
      };
    } catch (error: any) {
      console.error('❌ Email change verification error:', error);
      throw new Error(error.message || 'Failed to verify email change');
    }
  }
}

export const authService = new AuthService();

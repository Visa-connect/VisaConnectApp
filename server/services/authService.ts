import admin from 'firebase-admin';
import pool from '../db/config';
import { userService } from './userService';
import { BasicUserData, CreateUserData, User } from './userService';
import { config } from '../config/env';

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  token?: string; // Firebase ID token for authenticated API calls
}

export interface LoginData {
  email: string;
  password: string;
  mfaVerified?: boolean; // Flag to skip MFA check after verification
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
}

export class AuthService {
  // Register a new user
  async registerUser(registerData: RegisterData): Promise<AuthResponse> {
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
        };
      }

      const exchangeData = (await exchangeResponse.json()) as any;
      const idToken = exchangeData.idToken;

      // 4. Send email verification
      // await this.sendEmailVerification(firebaseUser.uid);

      return {
        success: true,
        message: 'User registered and logged in successfully.',
        user: userProfile,
        token: idToken, // Return the authentication token
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

      // 2. Check if user has MFA enabled (skip if already verified)
      if (!loginData.mfaVerified) {
        const mfaCheckQuery = await pool.query(
          'SELECT mfa_enabled FROM users WHERE id = $1',
          [firebaseUid]
        );

        if (
          mfaCheckQuery.rows.length > 0 &&
          mfaCheckQuery.rows[0].mfa_enabled
        ) {
          // MFA is enabled - return special response indicating MFA is required
          return {
            success: false,
            message: 'MFA verification required',
            requiresMfa: true,
            userId: firebaseUid,
          } as any;
        }
      }

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

      const exchangeData = (await exchangeResponse.json()) as any;
      const idToken = exchangeData.idToken; // Firebase ID token
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
      };
    } catch (error: any) {
      console.log('authService.loginUser ERROR', error);
      if (error.message === 'Invalid email or password') {
        throw error;
      }
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

      // In production, send this via your email service
      console.log('Password reset link:', resetLink);

      // await emailService.sendPasswordResetEmail(email, resetLink);
    } catch (error) {
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
}

export const authService = new AuthService();

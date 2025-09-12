import admin from 'firebase-admin';
import { config } from '../config/env';
import { AppError, ErrorCode } from '../types/errors';

export interface AdminAuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    uid: string;
    email: string;
    displayName?: string;
  };
}

export interface AdminLoginData {
  email: string;
  password: string;
}

export class AdminAuthServiceSimple {
  // Check if user has admin claims in Firebase
  private async isAdminUser(uid: string): Promise<boolean> {
    try {
      const userRecord = await admin.auth().getUser(uid);
      const customClaims = userRecord.customClaims;
      return !!(customClaims?.admin && customClaims?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Admin login using Firebase Auth REST API (same pattern as authService)
  async loginAdmin(loginData: AdminLoginData): Promise<AdminAuthResponse> {
    try {
      console.log('Admin login attempt for:', loginData.email);

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
        console.error('Firebase Auth REST API error:', {
          status: verifyPasswordResponse.status,
          statusText: verifyPasswordResponse.statusText,
          errorData: errorData,
        });

        if (
          errorData.error?.message?.includes('INVALID_PASSWORD') ||
          errorData.error?.message?.includes('EMAIL_NOT_FOUND') ||
          errorData.error?.message?.includes('INVALID_LOGIN_CREDENTIALS')
        ) {
          throw new AppError(
            'Invalid email or password',
            ErrorCode.INVALID_CREDENTIALS,
            401
          );
        }
        throw new AppError(
          `Authentication failed: ${
            errorData.error?.message || 'Unknown error'
          }`,
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }

      const authData = (await verifyPasswordResponse.json()) as any;
      const firebaseUid = authData.localId;

      // 2. Check if user has admin privileges
      const isAdmin = await this.isAdminUser(firebaseUid);
      if (!isAdmin) {
        throw new AppError(
          'Access denied. Admin privileges required.',
          ErrorCode.MEETUP_ACCESS_DENIED,
          403
        );
      }

      // 3. Ensure user has admin claims set in their user record
      await admin.auth().setCustomUserClaims(firebaseUid, {
        admin: true,
        role: 'admin',
      });

      // 4. Generate a custom token with admin claims
      const customToken = await admin.auth().createCustomToken(firebaseUid, {
        admin: true,
        role: 'admin',
      });

      // 5. Exchange custom token for ID token
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
        throw new AppError(
          'Failed to exchange custom token for ID token',
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }

      const exchangeData = (await exchangeResponse.json()) as any;
      const idToken = exchangeData.idToken;

      // 6. Get user details
      const userRecord = await admin.auth().getUser(firebaseUid);

      const response: AdminAuthResponse = {
        success: true,
        message: 'Admin login successful',
        token: idToken, // Return ID token instead of custom token
        user: {
          uid: userRecord.uid,
          email: userRecord.email || loginData.email,
          displayName: userRecord.displayName,
        },
      };

      return response;
    } catch (error) {
      console.error('Admin login error:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Admin authentication failed',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  // Admin logout
  async logoutAdmin(): Promise<{ success: boolean; message: string }> {
    try {
      return {
        success: true,
        message: 'Admin logout successful',
      };
    } catch (error) {
      console.error('Admin logout error:', error);
      throw new AppError('Logout failed', ErrorCode.INTERNAL_SERVER_ERROR, 500);
    }
  }

  // Verify admin token - for now, just check if user exists and has admin claims
  // This is a simplified approach for custom tokens
  async verifyAdminToken(token: string): Promise<{
    success: boolean;
    message: string;
    user?: {
      uid: string;
      email: string;
      admin: boolean;
      role: string;
    };
  }> {
    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Check if user has admin claims
      if (!decodedToken.admin || decodedToken.role !== 'admin') {
        throw new AppError(
          'Admin privileges required',
          ErrorCode.MEETUP_ACCESS_DENIED,
          403
        );
      }

      return {
        success: true,
        message: 'Token is valid',
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email || '',
          admin: decodedToken.admin,
          role: decodedToken.role,
        },
      };
    } catch (error) {
      console.error('Token verification error:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Invalid or expired token',
        ErrorCode.UNAUTHORIZED,
        401
      );
    }
  }
}

// Export singleton instance
export const adminAuthServiceSimple = new AdminAuthServiceSimple();
export default adminAuthServiceSimple;

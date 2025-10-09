/**
 * reCAPTCHA verification service
 * Verifies reCAPTCHA tokens with Google's API
 */

import { config } from '../config/env';

interface RecaptchaVerificationResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  score?: number;
  action?: string;
}

export class RecaptchaService {
  private readonly RECAPTCHA_VERIFY_URL =
    'https://www.google.com/recaptcha/api/siteverify';
  private readonly SECRET_KEY: string;

  constructor() {
    this.SECRET_KEY = config.recaptcha.secretKey || '';
    if (!this.SECRET_KEY) {
      console.warn(
        'RECAPTCHA_SECRET_KEY not set - reCAPTCHA verification will be skipped'
      );
    }
  }

  /**
   * Verify a reCAPTCHA token with Google
   * @param token - The reCAPTCHA token to verify
   * @param remoteip - Optional IP address of the user
   * @returns Promise<boolean> - True if verification succeeds
   */
  async verifyToken(token: string, remoteip?: string): Promise<boolean> {
    if (!this.SECRET_KEY) {
      console.log(
        'reCAPTCHA secret key not configured - skipping verification'
      );
      return true; // Skip verification in development
    }

    if (!token) {
      console.error('reCAPTCHA token is required');
      return false;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', this.SECRET_KEY);
      formData.append('response', token);
      if (remoteip) {
        formData.append('remoteip', remoteip);
      }

      const response = await fetch(this.RECAPTCHA_VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data = (await response.json()) as RecaptchaVerificationResponse;

      if (!data.success) {
        console.error('reCAPTCHA verification failed:', data['error-codes']);
        return false;
      }

      // For reCAPTCHA v3, also check the score (0.0 to 1.0, higher is better)
      if (data.score !== undefined && data.score < 0.5) {
        console.warn(`reCAPTCHA score too low: ${data.score}`);
        return false;
      }

      console.log('reCAPTCHA verification successful', {
        score: data.score,
        action: data.action,
      });

      return true;
    } catch (error) {
      console.error('Error verifying reCAPTCHA token:', error);
      return false;
    }
  }

  /**
   * Verify reCAPTCHA for phone authentication
   * @param token - The reCAPTCHA token
   * @param remoteip - Optional IP address
   * @returns Promise<boolean>
   */
  async verifyForPhoneAuth(token: string, remoteip?: string): Promise<boolean> {
    // For phone auth, we can be more lenient or use specific action validation
    const isValid = await this.verifyToken(token, remoteip);

    if (!isValid) {
      console.warn(
        'reCAPTCHA verification failed for phone auth - falling back to test mode'
      );
    }

    return isValid;
  }
}

export const recaptchaService = new RecaptchaService();

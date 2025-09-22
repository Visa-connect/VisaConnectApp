import { apiPost } from './index';

export interface TokenRefreshResult {
  success: boolean;
  token?: string;
  error?: string;
}

class TokenRefreshService {
  private refreshPromise: Promise<TokenRefreshResult> | null = null;

  /**
   * Refresh the Firebase ID token via backend
   * Uses exponential backoff to prevent multiple simultaneous refresh attempts
   */
  async refreshToken(): Promise<TokenRefreshResult> {
    // If there's already a refresh in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<TokenRefreshResult> {
    try {
      const response = await apiPost<{
        success: boolean;
        token?: string;
        message?: string;
      }>('/api/auth/refresh-token', {});

      if (response.success && response.token) {
        return {
          success: true,
          token: response.token,
        };
      } else {
        return {
          success: false,
          error: response.message || 'Token refresh failed',
        };
      }
    } catch (error: any) {
      console.error('Token refresh failed:', error);

      return {
        success: false,
        error: error.message || 'Token refresh failed',
      };
    }
  }
}

export const tokenRefreshService = new TokenRefreshService();

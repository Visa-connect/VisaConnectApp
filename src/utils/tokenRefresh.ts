import { apiPost } from '../api';
import { User } from '../types/api';

export interface TokenRefreshResponse {
  success: boolean;
  token: string;
  user: User;
  message: string;
}

export class TokenRefreshService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  /**
   * Decode JWT token to get expiration time
   */
  private decodeToken(token: string): { exp: number; iat: number } | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Get time until token expires in milliseconds
   */
  private getTimeUntilExpiry(token: string): number {
    const decoded = this.decodeToken(token);
    if (!decoded) return 0;

    const now = Math.floor(Date.now() / 1000);
    const expiry = decoded.exp;
    return (expiry - now) * 1000; // Convert to milliseconds
  }

  /**
   * Check if token is expired or will expire soon
   */
  private isTokenExpiringSoon(
    token: string,
    bufferMinutes: number = 5
  ): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry(token);
    const bufferMs = bufferMinutes * 60 * 1000;
    return timeUntilExpiry <= bufferMs;
  }

  /**
   * Refresh the token
   */
  private async refreshToken(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh API call
   */
  private async performTokenRefresh(): Promise<string> {
    try {
      const response = (await apiPost(
        '/api/auth/refresh-token',
        {}
      )) as TokenRefreshResponse;

      if (!response.success) {
        throw new Error(response.message || 'Token refresh failed');
      }

      return response.token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Start monitoring token expiration and refresh automatically
   */
  startTokenMonitoring(
    currentToken: string,
    onTokenRefresh: (newToken: string) => void,
    onRefreshError: (error: Error) => void
  ): void {
    this.stopTokenMonitoring();

    const checkAndRefresh = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          this.stopTokenMonitoring();
          return;
        }

        if (this.isTokenExpiringSoon(token)) {
          console.log('Token expiring soon, refreshing...');
          const newToken = await this.refreshToken();
          onTokenRefresh(newToken);

          // Schedule next check
          this.scheduleNextCheck(newToken, onTokenRefresh, onRefreshError);
        } else {
          // Schedule next check
          this.scheduleNextCheck(token, onTokenRefresh, onRefreshError);
        }
      } catch (error) {
        console.error('Token monitoring error:', error);
        onRefreshError(error as Error);
        this.stopTokenMonitoring();
      }
    };

    // Initial check
    checkAndRefresh();
  }

  /**
   * Schedule the next token check
   */
  private scheduleNextCheck(
    token: string,
    onTokenRefresh: (newToken: string) => void,
    onRefreshError: (error: Error) => void
  ): void {
    const timeUntilExpiry = this.getTimeUntilExpiry(token);
    const checkInterval = Math.min(timeUntilExpiry / 2, 30 * 60 * 1000); // Check every 30 minutes max

    // Ensure minimum interval to prevent immediate loops for expired tokens
    const minInterval = 60 * 1000; // 1 minute minimum
    const safeInterval = Math.max(checkInterval, minInterval);

    this.refreshTimer = setTimeout(() => {
      this.startTokenMonitoring(token, onTokenRefresh, onRefreshError);
    }, safeInterval);
  }

  /**
   * Stop token monitoring
   */
  stopTokenMonitoring(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Manually refresh token (for immediate refresh)
   */
  async manualRefresh(): Promise<string> {
    return this.refreshToken();
  }

  /**
   * Check if token is valid and not expired
   */
  isTokenValid(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return false;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp > now;
  }
}

// Export singleton instance
export const tokenRefreshService = new TokenRefreshService();

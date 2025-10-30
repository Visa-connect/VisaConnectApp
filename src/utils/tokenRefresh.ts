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

  // Configuration constants (avoid magic numbers)
  private static readonly DEFAULT_BUFFER_MINUTES = 5; // minutes
  private static readonly MAX_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  private static readonly MIN_CHECK_INTERVAL_MS = 60 * 1000; // 1 minute

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
    bufferMinutes: number = TokenRefreshService.DEFAULT_BUFFER_MINUTES
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
   * @param currentToken - The current token to start monitoring with
   * @param onTokenRefresh - Callback when token is refreshed
   * @param onRefreshError - Callback when refresh fails
   * @param getToken - Function to retrieve the current token (storage-agnostic)
   */
  startTokenMonitoring(
    currentToken: string,
    onTokenRefresh: (newToken: string) => void,
    onRefreshError: (error: Error) => void,
    getToken: () => string | null
  ): void {
    this.stopTokenMonitoring();
    // Initial check with provided token
    this.checkAndRefresh(
      currentToken,
      onTokenRefresh,
      onRefreshError,
      getToken
    );
  }

  /**
   * Run one check/refresh cycle and schedule the next
   */
  private async checkAndRefresh(
    tokenToCheck: string,
    onTokenRefresh: (newToken: string) => void,
    onRefreshError: (error: Error) => void,
    getToken: () => string | null
  ): Promise<void> {
    try {
      if (!tokenToCheck) {
        this.stopTokenMonitoring();
        return;
      }

      if (this.isTokenExpiringSoon(tokenToCheck)) {
        console.log('Token expiring soon, refreshing...');
        const newToken = await this.refreshToken();
        onTokenRefresh(newToken);
        // Schedule next check (will use token getter for fresh token)
        this.scheduleNextCheck(onTokenRefresh, onRefreshError, getToken);
      } else {
        // Schedule next check (will use token getter for fresh token)
        this.scheduleNextCheck(onTokenRefresh, onRefreshError, getToken);
      }
    } catch (error) {
      console.error('Token monitoring error:', error);
      onRefreshError(error as Error);
      this.stopTokenMonitoring();
    }
  }

  /**
   * Schedule the next token check
   */
  private scheduleNextCheck(
    onTokenRefresh: (newToken: string) => void,
    onRefreshError: (error: Error) => void,
    getToken: () => string | null
  ): void {
    // Get current token using provided getter function
    const currentToken = getToken();
    if (!currentToken) {
      this.stopTokenMonitoring();
      onRefreshError(new Error('No token available for scheduling'));
      return;
    }

    const timeUntilExpiry = this.getTimeUntilExpiry(currentToken);

    // If token is already expired (or clock skew makes it negative),
    // perform an immediate refresh cycle instead of scheduling a short loop.
    if (timeUntilExpiry <= 0) {
      this.checkAndRefresh(
        currentToken,
        onTokenRefresh,
        onRefreshError,
        getToken
      );
      return;
    }
    const checkInterval = Math.min(
      timeUntilExpiry / 2,
      TokenRefreshService.MAX_CHECK_INTERVAL_MS
    ); // Cap the check interval

    // Ensure minimum interval to prevent immediate loops for expired tokens
    const safeInterval = Math.max(
      checkInterval,
      TokenRefreshService.MIN_CHECK_INTERVAL_MS
    );

    this.refreshTimer = setTimeout(() => {
      // Get fresh token using provided getter function
      const freshToken = getToken();
      if (freshToken) {
        // Continue with a single-cycle check to avoid recursive
        // start/stop calls and keep the control flow flat.
        this.checkAndRefresh(
          freshToken,
          onTokenRefresh,
          onRefreshError,
          getToken
        );
      } else {
        // No token available, stop monitoring
        this.stopTokenMonitoring();
        onRefreshError(new Error('No token available for refresh'));
      }
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

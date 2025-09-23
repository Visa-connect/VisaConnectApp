import { apiPost } from './index';

export interface TokenRefreshResult {
  success: boolean;
  token?: string;
  error?: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

class TokenRefreshService {
  private refreshPromise: Promise<TokenRefreshResult> | null = null;
  private tokenCache: CachedToken | null = null;

  // Cache tokens for 45 minutes (Firebase tokens last 1 hour)
  private readonly CACHE_DURATION = 45 * 60 * 1000; // 45 minutes in milliseconds

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000; // 1 second base delay

  // Timeout tracking for monitoring
  private timeoutCount = 0;
  private lastTimeoutTime: number | null = null;

  // Temporary flag to disable refresh token logic
  private readonly REFRESH_TOKEN_DISABLED = true;

  /**
   * Refresh the Firebase ID token via backend
   * Uses caching and exponential backoff to prevent multiple simultaneous refresh attempts
   */
  async refreshToken(): Promise<TokenRefreshResult> {
    // Check if refresh token is disabled
    if (this.REFRESH_TOKEN_DISABLED) {
      console.log('Token refresh is temporarily disabled');
      return {
        success: false,
        error: 'Token refresh is temporarily disabled',
      };
    }

    // Check if we have a valid cached token first
    const cachedToken = this.getCachedToken();
    if (cachedToken) {
      console.log('Using cached token (cache hit)');
      return {
        success: true,
        token: cachedToken,
      };
    }

    console.log('No valid cached token, refreshing from server');

    // If there's already a refresh in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;

      // Cache the token if refresh was successful
      if (result.success && result.token) {
        this.setCachedToken(result.token);
      }

      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<TokenRefreshResult> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`Token refresh attempt ${attempt}/${this.MAX_RETRIES}`);

        const response = await apiPost<{
          success: boolean;
          token?: string;
          message?: string;
        }>('/api/auth/refresh-token', {});

        if (response.success && response.token) {
          console.log(`Token refresh successful on attempt ${attempt}`);
          return {
            success: true,
            token: response.token,
          };
        } else {
          const errorMsg = response.message || 'Token refresh failed';
          console.warn(
            `Token refresh failed on attempt ${attempt}: ${errorMsg}`
          );
          lastError = new Error(errorMsg);
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Token refresh attempt ${attempt} failed:`, error);

        // Check if it's a timeout error (408) and track it
        if (error.status === 408) {
          this.trackTimeout();
        }

        // Don't retry on the last attempt
        if (attempt === this.MAX_RETRIES) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.BASE_DELAY * Math.pow(2, attempt - 1);
        console.log(`Retrying token refresh in ${delay}ms...`);
        await this.delay(delay);
      }
    }

    // All retries failed
    console.error(`Token refresh failed after ${this.MAX_RETRIES} attempts`);
    return {
      success: false,
      error:
        lastError?.message || 'Token refresh failed after multiple attempts',
    };
  }

  /**
   * Get cached token if it's still valid
   */
  private getCachedToken(): string | null {
    if (!this.tokenCache) {
      return null;
    }

    const now = Date.now();
    if (now >= this.tokenCache.expiresAt) {
      // Cache expired, clear it
      this.tokenCache = null;
      return null;
    }

    return this.tokenCache.token;
  }

  /**
   * Cache a token with expiration time
   */
  private setCachedToken(token: string): void {
    const expiresAt = Date.now() + this.CACHE_DURATION;
    this.tokenCache = {
      token,
      expiresAt,
    };
    console.log(`Token cached until ${new Date(expiresAt).toISOString()}`);
  }

  /**
   * Clear the token cache (useful when user logs out or token is manually updated)
   */
  public clearCache(): void {
    this.tokenCache = null;
    console.log('Token cache cleared');
  }

  /**
   * Check if we have a valid cached token (for debugging/monitoring)
   */
  public hasCachedToken(): boolean {
    return this.getCachedToken() !== null;
  }

  /**
   * Get cache status for debugging/monitoring
   */
  public getCacheStatus(): {
    hasCache: boolean;
    expiresAt?: string;
    timeUntilExpiry?: number;
  } {
    if (!this.tokenCache) {
      return { hasCache: false };
    }

    const now = Date.now();
    const timeUntilExpiry = this.tokenCache.expiresAt - now;

    return {
      hasCache: true,
      expiresAt: new Date(this.tokenCache.expiresAt).toISOString(),
      timeUntilExpiry: Math.max(0, timeUntilExpiry),
    };
  }

  /**
   * Get timeout statistics for monitoring
   */
  public getTimeoutStats(): {
    count: number;
    lastTimeout?: string;
    timeSinceLastTimeout?: number;
  } {
    const stats: { count: number; lastTimeout?: string; timeSinceLastTimeout?: number } = { count: this.timeoutCount };

    if (this.lastTimeoutTime) {
      stats.lastTimeout = new Date(this.lastTimeoutTime).toISOString();
      stats.timeSinceLastTimeout = Date.now() - this.lastTimeoutTime;
    }

    return stats;
  }

  /**
   * Utility method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Track timeout occurrences for monitoring
   */
  private trackTimeout(): void {
    this.timeoutCount++;
    this.lastTimeoutTime = Date.now();

    console.warn(`Timeout detected! Total timeouts: ${this.timeoutCount}`);

    // Log warning if we're seeing frequent timeouts
    if (this.timeoutCount >= 5) {
      console.error(
        `High timeout frequency detected: ${this.timeoutCount} timeouts. This may indicate Firebase connectivity issues.`
      );
    }
  }

  /**
   * Reset timeout statistics (useful for testing or manual reset)
   */
  public resetTimeoutStats(): void {
    this.timeoutCount = 0;
    this.lastTimeoutTime = null;
    console.log('Timeout statistics reset');
  }

  /**
   * Get comprehensive service status for debugging
   */
  public getServiceStatus(): {
    cache: { hasCache: boolean; expiresAt?: string; timeUntilExpiry?: number };
    timeouts: {
      count: number;
      lastTimeout?: string;
      timeSinceLastTimeout?: number;
    };
    hasActiveRefresh: boolean;
  } {
    return {
      cache: this.getCacheStatus(),
      timeouts: this.getTimeoutStats(),
      hasActiveRefresh: this.refreshPromise !== null,
    };
  }
}

export const tokenRefreshService = new TokenRefreshService();

// Expose debugging utilities to window object in development

interface TokenDebug {
  getStatus: () => ReturnType<typeof tokenRefreshService.getServiceStatus>;
  getCacheStatus: () => ReturnType<typeof tokenRefreshService.getCacheStatus>;
  getTimeoutStats: () => ReturnType<typeof tokenRefreshService.getTimeoutStats>;
  clearCache: () => void;
  resetTimeoutStats: () => void;
  hasCachedToken: () => boolean;
}

declare global {
  interface Window {
    tokenDebug: TokenDebug;
  }
}

if (process.env.NODE_ENV === 'development') {
  window.tokenDebug = {
    getStatus: () => tokenRefreshService.getServiceStatus(),
    getCacheStatus: () => tokenRefreshService.getCacheStatus(),
    getTimeoutStats: () => tokenRefreshService.getTimeoutStats(),
    clearCache: () => tokenRefreshService.clearCache(),
    resetTimeoutStats: () => tokenRefreshService.resetTimeoutStats(),
    hasCachedToken: () => tokenRefreshService.hasCachedToken(),
  };
}

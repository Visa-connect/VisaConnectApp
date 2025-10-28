// Test file: src/utils/__tests__/tokenRefresh.test.ts
import { tokenRefreshService } from '../tokenRefresh';

// Mock API call
jest.mock('../../api', () => ({
  apiPost: jest.fn(),
}));

describe('TokenRefreshService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Token Validation', () => {
    it('should identify valid tokens', () => {
      const validToken = createMockToken(Date.now() / 1000 + 3600); // 1 hour from now
      expect(tokenRefreshService.isTokenValid(validToken)).toBe(true);
    });

    it('should identify expired tokens', () => {
      const expiredToken = createMockToken(Date.now() / 1000 - 3600); // 1 hour ago
      expect(tokenRefreshService.isTokenValid(expiredToken)).toBe(false);
    });
  });

  describe('Token Expiration Detection', () => {
    it('should detect tokens expiring soon', () => {
      const expiringToken = createMockToken(Date.now() / 1000 + 300); // 5 minutes from now
      const isExpiring = tokenRefreshService['isTokenExpiringSoon'](
        expiringToken,
        5
      );
      expect(isExpiring).toBe(true);
    });

    it('should not flag tokens with plenty of time', () => {
      const freshToken = createMockToken(Date.now() / 1000 + 1800); // 30 minutes from now
      const isExpiring = tokenRefreshService['isTokenExpiringSoon'](
        freshToken,
        5
      );
      expect(isExpiring).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        success: true,
        token: 'new-token',
        message: 'Token refreshed successfully',
      };

      const { apiPost } = require('../../api');
      apiPost.mockResolvedValue(mockResponse);

      const newToken = await tokenRefreshService.manualRefresh();
      expect(newToken).toBe('new-token');
      expect(apiPost).toHaveBeenCalledWith('/api/auth/refresh-token', {});
    });

    it('should handle refresh failures', async () => {
      const { apiPost } = require('../../api');
      apiPost.mockRejectedValue(new Error('Network error'));

      await expect(tokenRefreshService.manualRefresh()).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('Token Monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start monitoring and refresh when needed', async () => {
      const expiringToken = createMockToken(Date.now() / 1000 + 300); // 5 minutes from now
      localStorage.setItem('userToken', expiringToken);

      const mockResponse = {
        success: true,
        token: 'refreshed-token',
        message: 'Token refreshed successfully',
      };

      const { apiPost } = require('../../api');
      apiPost.mockResolvedValue(mockResponse);

      const onTokenRefresh = jest.fn();
      const onRefreshError = jest.fn();

      tokenRefreshService.startTokenMonitoring(
        expiringToken,
        onTokenRefresh,
        onRefreshError
      );

      // Fast-forward time to trigger refresh
      jest.advanceTimersByTime(1000);

      await Promise.resolve(); // Wait for async operations

      expect(onTokenRefresh).toHaveBeenCalledWith('refreshed-token');
      expect(onRefreshError).not.toHaveBeenCalled();
    });
  });
});

// Helper function to create mock JWT tokens
function createMockToken(exp: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { exp, iat: Math.floor(Date.now() / 1000) };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

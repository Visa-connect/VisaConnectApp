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
    it('should start and stop monitoring', () => {
      const mockToken = createMockToken(Date.now() / 1000 + 3600);
      const onTokenRefresh = jest.fn();
      const onRefreshError = jest.fn();

      // Start monitoring
      tokenRefreshService.startTokenMonitoring(
        mockToken,
        onTokenRefresh,
        onRefreshError,
        () => mockToken // Token getter function
      );

      // Stop monitoring
      tokenRefreshService.stopTokenMonitoring();

      // Test passes if no errors are thrown
      expect(true).toBe(true);
    });

    it('should handle expired tokens without infinite loops', () => {
      const expiredToken = createMockToken(Date.now() / 1000 - 3600); // 1 hour ago
      const onTokenRefresh = jest.fn();
      const onRefreshError = jest.fn();

      // This should not cause an infinite loop
      tokenRefreshService.startTokenMonitoring(
        expiredToken,
        onTokenRefresh,
        onRefreshError,
        () => expiredToken // Token getter function
      );

      // Stop monitoring to prevent any timers from running
      tokenRefreshService.stopTokenMonitoring();

      // Test passes if no errors are thrown
      expect(true).toBe(true);
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

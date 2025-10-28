// Test file: src/stores/__tests__/userStore.test.ts
import { useUserStore } from '../userStore';
import { tokenRefreshService } from '../../utils/tokenRefresh';

// Mock the token refresh service
jest.mock('../../utils/tokenRefresh', () => ({
  tokenRefreshService: {
    startTokenMonitoring: jest.fn(),
    stopTokenMonitoring: jest.fn(),
    isTokenValid: jest.fn(),
    manualRefresh: jest.fn(),
  },
}));

const mockTokenRefreshService = tokenRefreshService as jest.Mocked<
  typeof tokenRefreshService
>;

describe('UserStore Token Refresh Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should start token monitoring when user is set', () => {
    const mockUser = { uid: 'test-uid', email: 'test@example.com' };
    const mockToken = 'mock-token';

    localStorage.setItem('userToken', mockToken);
    useUserStore.getState().setUser(mockUser);

    expect(mockTokenRefreshService.startTokenMonitoring).toHaveBeenCalledWith(
      mockToken,
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should stop token monitoring when user is cleared', () => {
    useUserStore.getState().clearUser();
    expect(mockTokenRefreshService.stopTokenMonitoring).toHaveBeenCalled();
  });

  it('should handle token refresh success', () => {
    const mockUser = { uid: 'test-uid', email: 'test@example.com' };
    const mockToken = 'mock-token';
    const newToken = 'new-token';

    localStorage.setItem('userToken', mockToken);
    useUserStore.getState().setUser(mockUser);

    // Simulate successful token refresh callback
    const refreshCallback =
      mockTokenRefreshService.startTokenMonitoring.mock.calls[0][1];
    refreshCallback(newToken);

    expect(localStorage.getItem('userToken')).toBe(newToken);
  });

  // it('should clear user data on token refresh failure', () => {
  //   const mockUser = { uid: 'test-uid', email: 'test@example.com' };
  //   const mockToken = 'mock-token';

  //   localStorage.setItem('userToken', mockToken);
  //   localStorage.setItem('userData', JSON.stringify(mockUser));
  //   useUserStore.getState().setUser(mockUser);

  //   // Simulate token refresh error callback
  //   const errorCallback =
  //     mockTokenRefreshService.startTokenMonitoring.mock.calls[0][2];
  //   errorCallback(new Error('Refresh failed'));

  //   expect(useUserStore.getState().user).toBeNull();
  //   expect(useUserStore.getState().isAuthenticated).toBe(false);
  //   expect(localStorage.getItem('userToken')).toBeNull();
  // });
});

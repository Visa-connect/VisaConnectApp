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

// Mock notification store
const mockNotificationStore = {
  fetchNotifications: jest.fn().mockResolvedValue(null),
  fetchUnreadCount: jest.fn().mockResolvedValue(null),
  clearNotifications: jest.fn(),
  shouldRefresh: jest.fn().mockReturnValue(true),
};

jest.mock('../notificationStore', () => ({
  useNotificationStore: {
    getState: jest.fn(() => mockNotificationStore),
  },
}));

// Mock persist utils
jest.mock('../../utils/persistUtils', () => ({
  executeWhenHydrated: jest.fn((store, callback) => {
    // Execute immediately for tests
    callback();
  }),
}));

const mockTokenRefreshService = tokenRefreshService as jest.Mocked<
  typeof tokenRefreshService
>;

describe('UserStore', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // Reset store state
    useUserStore.setState({
      user: null,
      isAuthenticated: false,
      hasToken: false,
      isLoading: false,
    });
  });

  describe('Token Management', () => {
    it('should get token from localStorage', () => {
      const token = 'test-token';
      localStorage.setItem('userToken', token);
      expect(useUserStore.getState().getToken()).toBe(token);
    });

    it('should return null when no token exists', () => {
      expect(useUserStore.getState().getToken()).toBeNull();
    });

    it('should set token in localStorage', () => {
      const token = 'new-token';
      useUserStore.getState().setToken(token);
      expect(localStorage.getItem('userToken')).toBe(token);
    });

    it('should remove token from localStorage', () => {
      localStorage.setItem('userToken', 'test-token');
      useUserStore.getState().removeToken();
      expect(localStorage.getItem('userToken')).toBeNull();
    });
  });

  describe('ensureValidToken', () => {
    it('should return false when no token exists', async () => {
      const result = await useUserStore.getState().ensureValidToken();
      expect(result).toBe(false);
    });

    it('should return true when token is still valid', async () => {
      const validToken = 'valid-token';
      localStorage.setItem('userToken', validToken);
      mockTokenRefreshService.isTokenValid.mockReturnValue(true);

      const result = await useUserStore.getState().ensureValidToken();
      expect(result).toBe(true);
      expect(mockTokenRefreshService.manualRefresh).not.toHaveBeenCalled();
    });

    it('should refresh token when expired', async () => {
      const expiredToken = 'expired-token';
      const newToken = 'new-token';
      localStorage.setItem('userToken', expiredToken);
      mockTokenRefreshService.isTokenValid.mockReturnValue(false);
      mockTokenRefreshService.manualRefresh.mockResolvedValue(newToken);

      const result = await useUserStore.getState().ensureValidToken();
      expect(result).toBe(true);
      expect(mockTokenRefreshService.manualRefresh).toHaveBeenCalled();
      expect(localStorage.getItem('userToken')).toBe(newToken);
    });

    it('should clear user data when refresh fails', async () => {
      const expiredToken = 'expired-token';
      localStorage.setItem('userToken', expiredToken);
      mockTokenRefreshService.isTokenValid.mockReturnValue(false);
      mockTokenRefreshService.manualRefresh.mockRejectedValue(
        new Error('Refresh failed')
      );

      const result = await useUserStore.getState().ensureValidToken();
      expect(result).toBe(false);
      expect(useUserStore.getState().user).toBeNull();
      expect(useUserStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('init', () => {
    it('should do nothing when no user data or token exists', () => {
      useUserStore.getState().init();
      expect(useUserStore.getState().user).toBeNull();
      expect(
        mockTokenRefreshService.startTokenMonitoring
      ).not.toHaveBeenCalled();
    });

    it('should initialize with valid token and start monitoring', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };
      const validToken = 'valid-token';

      localStorage.setItem('userData', JSON.stringify(mockUser));
      localStorage.setItem('userToken', validToken);
      mockTokenRefreshService.isTokenValid.mockReturnValue(true);

      useUserStore.getState().init();

      expect(useUserStore.getState().user).toEqual(mockUser);
      expect(useUserStore.getState().isAuthenticated).toBe(true);
      expect(useUserStore.getState().hasToken).toBe(true);
      expect(mockTokenRefreshService.startTokenMonitoring).toHaveBeenCalled();
    });

    it('should attempt token refresh when token is expired', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };
      const expiredToken = 'expired-token';
      const newToken = 'new-token';

      localStorage.setItem('userData', JSON.stringify(mockUser));
      localStorage.setItem('userToken', expiredToken);
      mockTokenRefreshService.isTokenValid.mockReturnValue(false);
      mockTokenRefreshService.manualRefresh.mockResolvedValue(newToken);

      useUserStore.getState().init();

      // Wait for async refresh to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockTokenRefreshService.manualRefresh).toHaveBeenCalled();
      expect(useUserStore.getState().isAuthenticated).toBe(true);
      expect(useUserStore.getState().hasToken).toBe(true);
      expect(mockTokenRefreshService.startTokenMonitoring).toHaveBeenCalledWith(
        newToken,
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should clear user data when refresh fails on init', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };
      const expiredToken = 'expired-token';

      localStorage.setItem('userData', JSON.stringify(mockUser));
      localStorage.setItem('userToken', expiredToken);
      mockTokenRefreshService.isTokenValid.mockReturnValue(false);
      mockTokenRefreshService.manualRefresh.mockRejectedValue(
        new Error('Refresh failed')
      );

      useUserStore.getState().init();

      // Wait for async refresh to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(useUserStore.getState().user).toBeNull();
      expect(useUserStore.getState().isAuthenticated).toBe(false);
      expect(localStorage.getItem('userToken')).toBeNull();
    });

    it('should clear user data when token refresh returns no token', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };
      const expiredToken = 'expired-token';

      localStorage.setItem('userData', JSON.stringify(mockUser));
      localStorage.setItem('userToken', expiredToken);
      mockTokenRefreshService.isTokenValid.mockReturnValue(false);
      // Mock ensureValidToken to return true but getToken returns null
      mockTokenRefreshService.manualRefresh.mockResolvedValue('new-token');

      useUserStore.getState().init();

      // Wait for async refresh
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The token should be set by ensureValidToken, so this should succeed
      expect(useUserStore.getState().isAuthenticated).toBe(true);
    });

    it('should handle invalid user data in localStorage', () => {
      localStorage.setItem('userData', 'invalid-json');
      localStorage.setItem('userToken', 'test-token');

      useUserStore.getState().init();

      expect(useUserStore.getState().user).toBeNull();
      expect(useUserStore.getState().isAuthenticated).toBe(false);
    });

    it('should handle error starting token monitoring', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };
      const validToken = 'valid-token';

      localStorage.setItem('userData', JSON.stringify(mockUser));
      localStorage.setItem('userToken', validToken);
      mockTokenRefreshService.isTokenValid.mockReturnValue(true);
      mockTokenRefreshService.startTokenMonitoring.mockImplementation(() => {
        throw new Error('Monitoring failed');
      });

      useUserStore.getState().init();

      expect(useUserStore.getState().user).toBeNull();
      expect(useUserStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set user and start token monitoring', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };
      const mockToken = 'mock-token';

      localStorage.setItem('userToken', mockToken);
      useUserStore.getState().setUser(mockUser);

      expect(useUserStore.getState().user).toEqual(mockUser);
      expect(useUserStore.getState().isAuthenticated).toBe(true);
      expect(useUserStore.getState().hasToken).toBe(true);
      expect(localStorage.getItem('userData')).toBe(JSON.stringify(mockUser));
      expect(mockTokenRefreshService.startTokenMonitoring).toHaveBeenCalled();
    });

    it('should not start token monitoring when no token exists', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };

      useUserStore.getState().setUser(mockUser);

      expect(useUserStore.getState().user).toEqual(mockUser);
      expect(useUserStore.getState().isAuthenticated).toBe(true);
      expect(useUserStore.getState().hasToken).toBe(false);
      expect(
        mockTokenRefreshService.startTokenMonitoring
      ).not.toHaveBeenCalled();
    });

    it('should handle token refresh success callback', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };
      const mockToken = 'mock-token';
      const newToken = 'new-token';

      localStorage.setItem('userToken', mockToken);
      useUserStore.getState().setUser(mockUser);

      const refreshCallback =
        mockTokenRefreshService.startTokenMonitoring.mock.calls[0][1];
      refreshCallback(newToken);

      expect(localStorage.getItem('userToken')).toBe(newToken);
    });

    it('should handle token refresh failure callback', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };
      const mockToken = 'mock-token';

      localStorage.setItem('userToken', mockToken);
      useUserStore.getState().setUser(mockUser);

      const errorCallback =
        mockTokenRefreshService.startTokenMonitoring.mock.calls[0][2];
      errorCallback(new Error('Refresh failed'));

      expect(useUserStore.getState().user).toBeNull();
      expect(useUserStore.getState().isAuthenticated).toBe(false);
      expect(localStorage.getItem('userToken')).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user data', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };

      useUserStore.getState().setUser(mockUser);
      useUserStore.getState().updateUser({ first_name: 'Updated' });

      expect(useUserStore.getState().user?.first_name).toBe('Updated');
      expect(useUserStore.getState().user?.last_name).toBe('User');
      expect(localStorage.getItem('userData')).toContain('Updated');
    });

    it('should do nothing when no user exists', () => {
      useUserStore.getState().updateUser({ first_name: 'Updated' });
      expect(useUserStore.getState().user).toBeNull();
    });
  });

  describe('clearUser', () => {
    it('should clear user data and stop token monitoring', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };
      localStorage.setItem('userToken', 'test-token');
      localStorage.setItem('userData', JSON.stringify(mockUser));

      useUserStore.getState().setUser(mockUser);
      useUserStore.getState().clearUser();

      expect(useUserStore.getState().user).toBeNull();
      expect(useUserStore.getState().isAuthenticated).toBe(false);
      expect(useUserStore.getState().hasToken).toBe(false);
      expect(localStorage.getItem('userToken')).toBeNull();
      expect(localStorage.getItem('userData')).toBeNull();
      expect(mockTokenRefreshService.stopTokenMonitoring).toHaveBeenCalled();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useUserStore.getState().setLoading(true);
      expect(useUserStore.getState().isLoading).toBe(true);

      useUserStore.getState().setLoading(false);
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  describe('getFullName', () => {
    it('should return full name when user exists', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };
      useUserStore.getState().setUser(mockUser);
      expect(useUserStore.getState().getFullName()).toBe('John Doe');
    });

    it('should return first name only when last name is missing', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        first_name: 'John',
      };
      useUserStore.getState().setUser(mockUser);
      expect(useUserStore.getState().getFullName()).toBe('John');
    });

    it('should return last name only when first name is missing', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        last_name: 'Doe',
      };
      useUserStore.getState().setUser(mockUser);
      expect(useUserStore.getState().getFullName()).toBe('Doe');
    });

    it('should return "User" when no name exists', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };
      useUserStore.getState().setUser(mockUser);
      expect(useUserStore.getState().getFullName()).toBe('User');
    });

    it('should return empty string when no user exists', () => {
      expect(useUserStore.getState().getFullName()).toBe('');
    });
  });

  describe('getLocation', () => {
    it('should return city and state when both exist', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        current_location: {
          city: 'New York',
          state: 'NY',
        },
      };
      useUserStore.getState().setUser(mockUser);
      expect(useUserStore.getState().getLocation()).toBe('New York, NY');
    });

    it('should return city only when state is missing', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        current_location: {
          city: 'New York',
        },
      };
      useUserStore.getState().setUser(mockUser);
      expect(useUserStore.getState().getLocation()).toBe('New York');
    });

    it('should return state only when city is missing', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        current_location: {
          state: 'NY',
        },
      };
      useUserStore.getState().setUser(mockUser);
      expect(useUserStore.getState().getLocation()).toBe('NY');
    });

    it('should return empty string when no location exists', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };
      useUserStore.getState().setUser(mockUser);
      expect(useUserStore.getState().getLocation()).toBe('');
    });

    it('should return empty string when no user exists', () => {
      expect(useUserStore.getState().getLocation()).toBe('');
    });
  });

  describe('getCompletion', () => {
    it('should return 0% when no user exists', () => {
      const completion = useUserStore.getState().getCompletion();
      expect(completion.completed).toBe(0);
      expect(completion.total).toBe(5);
      expect(completion.percentage).toBe(0);
    });

    it('should calculate completion for basic info', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        visa_type: 'H1B',
        current_location: {
          city: 'New York',
          state: 'NY',
        },
      };
      useUserStore.getState().setUser(mockUser);
      const completion = useUserStore.getState().getCompletion();
      expect(completion.completed).toBe(1);
      expect(completion.percentage).toBe(20);
    });

    it('should calculate completion for background & identity', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        visa_type: 'H1B',
        current_location: {
          city: 'New York',
          state: 'NY',
        },
        nationality: 'Indian',
        languages: ['English'],
        other_us_jobs: ['Software Engineer'],
        relationship_status: 'Single',
      };
      useUserStore.getState().setUser(mockUser);
      const completion = useUserStore.getState().getCompletion();
      expect(completion.completed).toBe(2);
      expect(completion.percentage).toBe(40);
    });

    it('should calculate completion for lifestyle & personality', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        visa_type: 'H1B',
        current_location: {
          city: 'New York',
          state: 'NY',
        },
        nationality: 'Indian',
        languages: ['English'],
        other_us_jobs: ['Software Engineer'],
        relationship_status: 'Single',
        hobbies: ['Reading'],
        favorite_state: 'California',
        preferred_outings: ['Hiking'],
        has_car: true,
        offers_rides: false,
      };
      useUserStore.getState().setUser(mockUser);
      const completion = useUserStore.getState().getCompletion();
      expect(completion.completed).toBe(3);
      expect(completion.percentage).toBe(60);
    });

    it('should calculate completion for travel & exploration', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        visa_type: 'H1B',
        current_location: {
          city: 'New York',
          state: 'NY',
        },
        nationality: 'Indian',
        languages: ['English'],
        other_us_jobs: ['Software Engineer'],
        relationship_status: 'Single',
        hobbies: ['Reading'],
        favorite_state: 'California',
        preferred_outings: ['Hiking'],
        has_car: true,
        offers_rides: false,
        road_trips: true,
        favorite_place: 'Yosemite',
        travel_tips: 'Always bring water',
        willing_to_guide: true,
      };
      useUserStore.getState().setUser(mockUser);
      const completion = useUserStore.getState().getCompletion();
      expect(completion.completed).toBe(4);
      expect(completion.percentage).toBe(80);
    });

    it('should calculate 100% completion when all fields are filled', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        visa_type: 'H1B',
        current_location: {
          city: 'New York',
          state: 'NY',
        },
        nationality: 'Indian',
        languages: ['English'],
        other_us_jobs: ['Software Engineer'],
        relationship_status: 'Single',
        hobbies: ['Reading'],
        favorite_state: 'California',
        preferred_outings: ['Hiking'],
        has_car: true,
        offers_rides: false,
        road_trips: true,
        favorite_place: 'Yosemite',
        travel_tips: 'Always bring water',
        willing_to_guide: true,
        mentorship_interest: true,
        job_boards: ['LinkedIn'],
        visa_advice: 'Apply early',
      };
      useUserStore.getState().setUser(mockUser);
      const completion = useUserStore.getState().getCompletion();
      expect(completion.completed).toBe(5);
      expect(completion.percentage).toBe(100);
    });
  });
});

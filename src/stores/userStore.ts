import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { tokenRefreshService } from '../utils/tokenRefresh';
import { useNotificationStore } from './notificationStore';
import { executeWhenHydrated } from '../utils/persistUtils';
import { User } from '../types/api';

// User data interface - extends the consolidated User interface with uid field
export interface UserData extends Omit<User, 'id'> {
  uid: string; // Use uid instead of id for consistency with Firebase
}

// Helper function to convert User (from API) to UserData (for store)
export const userToUserData = (user: User): UserData => {
  const { id, ...rest } = user;
  return { ...rest, uid: id };
};

// Helper function to convert UserData (from store) to User (for API)
export const userDataToUser = (userData: UserData): User => {
  const { uid, ...rest } = userData;
  return { ...rest, id: uid };
};

// Store interface
interface UserStore {
  // State
  user: UserData | null;
  isAuthenticated: boolean;
  hasToken: boolean;
  isLoading: boolean;

  // Actions
  init: () => void;
  setUser: (user: UserData) => void;
  updateUser: (updates: Partial<UserData>) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;

  // Token management
  getToken: () => string | null;
  setToken: (token: string) => void;
  removeToken: () => void;
  ensureValidToken: () => Promise<boolean>;

  // Computed values
  getFullName: () => string;
  getLocation: () => string;
  getCompletion: () => { completed: number; total: number; percentage: number };
}

// Create the store
export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // Initialize from localStorage for backward compatibility
      init: () => {
        const userData = localStorage.getItem('userData');
        const userToken = get().getToken();

        if (userData && userToken) {
          try {
            const user = JSON.parse(userData);

            // Start token monitoring for existing user
            if (tokenRefreshService.isTokenValid(userToken)) {
              // Token is valid, set authenticated state and start monitoring
              set({ user, isAuthenticated: true, hasToken: true });
              try {
                tokenRefreshService.startTokenMonitoring(
                  userToken,
                  (newToken) => {
                    // Token refreshed successfully
                    get().setToken(newToken);
                    console.log('Token automatically refreshed on init');
                  },
                  (error) => {
                    // Token refresh failed, clear user data
                    console.error(
                      'Automatic token refresh failed on init:',
                      error
                    );
                    get().clearUser();
                  },
                  () => get().getToken() // Token getter function (storage-agnostic)
                );
              } catch (error) {
                console.error(
                  'Error starting token monitoring on init:',
                  error
                );
                get().clearUser();
              }
            } else {
              // Token is expired, try to refresh it using the refresh token cookie
              console.log('Token expired on init, attempting to refresh...');
              // Set loading state while attempting refresh
              set({
                user,
                isAuthenticated: false,
                hasToken: false,
                isLoading: true,
              });

              get()
                .ensureValidToken()
                .then((refreshed) => {
                  if (refreshed) {
                    const newToken = get().getToken();
                    if (newToken) {
                      // Refresh succeeded, set authenticated state
                      set({
                        user,
                        isAuthenticated: true,
                        hasToken: true,
                        isLoading: false,
                      });
                      // Start token monitoring with the new token
                      tokenRefreshService.startTokenMonitoring(
                        newToken,
                        (newToken) => {
                          get().setToken(newToken);
                          console.log('Token automatically refreshed on init');
                        },
                        (error) => {
                          console.error(
                            'Automatic token refresh failed on init:',
                            error
                          );
                          get().clearUser();
                        },
                        () => get().getToken()
                      );

                      // Fetch notifications after successful refresh
                      const hydrateAndFetch = () => {
                        const notificationStore =
                          useNotificationStore.getState();
                        if (
                          notificationStore &&
                          notificationStore.shouldRefresh()
                        ) {
                          notificationStore
                            .fetchNotifications()
                            .catch((error) => {
                              console.error(
                                'Failed to fetch notifications on init:',
                                error
                              );
                            });
                          notificationStore
                            .fetchUnreadCount()
                            .catch((error) => {
                              console.error(
                                'Failed to fetch unread count on init:',
                                error
                              );
                            });
                        }
                      };
                      executeWhenHydrated(
                        useNotificationStore,
                        hydrateAndFetch
                      );
                    } else {
                      // No token after refresh, clear user data
                      console.log('No token after refresh, clearing user data');
                      get().clearUser();
                    }
                  } else {
                    // Refresh failed, clear user data
                    console.log(
                      'Token refresh failed on init, clearing user data'
                    );
                    get().clearUser();
                  }
                })
                .catch((error) => {
                  console.error('Error refreshing token on init:', error);
                  get().clearUser();
                });
              return;
            }

            // Fetch notifications if user is already authenticated
            const hydrateAndFetch = () => {
              const notificationStore = useNotificationStore.getState();
              if (notificationStore && notificationStore.shouldRefresh()) {
                notificationStore.fetchNotifications().catch((error) => {
                  console.error(
                    'Failed to fetch notifications on init:',
                    error
                  );
                });
                notificationStore.fetchUnreadCount().catch((error) => {
                  console.error('Failed to fetch unread count on init:', error);
                });
              }
            };

            // Ensure the notification store is hydrated before use to avoid race conditions
            executeWhenHydrated(useNotificationStore, hydrateAndFetch);
          } catch (error) {
            console.error(
              'Failed to parse user data from localStorage:',
              error
            );
            // Clear invalid data
            get().clearUser();
          }
        }
      },
      // Initial state
      user: null,
      isAuthenticated: false,
      hasToken: false,
      isLoading: false,

      // Actions
      setUser: (user: UserData) => {
        const hasToken = !!get().getToken();
        set({ user, isAuthenticated: true, hasToken });
        // Also update localStorage for backward compatibility
        localStorage.setItem('userData', JSON.stringify(user));

        // Start token monitoring if we have a token
        if (hasToken) {
          const currentToken = get().getToken();
          if (currentToken) {
            tokenRefreshService.startTokenMonitoring(
              currentToken,
              (newToken) => {
                // Token refreshed successfully
                get().setToken(newToken);
                console.log('Token automatically refreshed');
              },
              (error) => {
                // Token refresh failed, clear user data
                console.error('Automatic token refresh failed:', error);
                get().clearUser();
              },
              () => get().getToken() // Token getter function (storage-agnostic)
            );
          }
        }

        // Fetch notifications after successful login
        if (hasToken) {
          const runFetch = () => {
            const notificationStore = useNotificationStore.getState();
            if (notificationStore) {
              notificationStore.fetchNotifications().catch((error) => {
                console.error(
                  'Failed to fetch notifications after login:',
                  error
                );
              });
              notificationStore.fetchUnreadCount().catch((error) => {
                console.error(
                  'Failed to fetch unread count after login:',
                  error
                );
              });
            }
          };

          // Ensure notification store is hydrated first
          executeWhenHydrated(useNotificationStore, runFetch);
        }
      },

      updateUser: (updates: Partial<UserData>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates };
          set({ user: updatedUser });
          // Update localStorage
          localStorage.setItem('userData', JSON.stringify(updatedUser));
        }
      },

      clearUser: () => {
        // Stop token monitoring
        tokenRefreshService.stopTokenMonitoring();

        set({ user: null, isAuthenticated: false, hasToken: false });
        // Clear localStorage
        localStorage.removeItem('userData');
        get().removeToken();

        // Clear notifications when user logs out
        const notificationStore = useNotificationStore.getState();
        if (notificationStore) {
          notificationStore.clearNotifications();
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      // Token management
      getToken: () => localStorage.getItem('userToken'),
      setToken: (token: string) => {
        localStorage.setItem('userToken', token);
        // Clear cache when token is manually set to ensure consistency
        // tokenRefreshService.clearCache(); // Temporarily disabled
      },
      removeToken: () => localStorage.removeItem('userToken'),

      ensureValidToken: async () => {
        try {
          const currentToken = get().getToken();
          if (!currentToken) {
            console.log('No token to validate');
            return false;
          }

          // Check if token is still valid before attempting refresh
          if (tokenRefreshService.isTokenValid(currentToken)) {
            console.log('Token is still valid, no refresh needed');
            return true;
          }

          console.log('Refreshing token...');
          const newToken = await tokenRefreshService.manualRefresh();

          // Update token in localStorage and store
          get().setToken(newToken);

          console.log('Token refreshed successfully');
          return true;
        } catch (error) {
          console.error('Token refresh failed:', error);
          // If refresh fails, clear user data to force re-login
          get().clearUser();
          return false;
        }
      },

      // Computed values
      getFullName: () => {
        const user = get().user;
        if (!user) return '';
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        return `${firstName} ${lastName}`.trim() || 'User';
      },

      getLocation: () => {
        const user = get().user;
        if (!user?.current_location) return '';
        const { city, state } = user.current_location;
        if (city && state) return `${city}, ${state}`;
        if (city) return city;
        if (state) return state;
        return '';
      },

      getCompletion: () => {
        const user = get().user;
        if (!user) return { completed: 0, total: 5, percentage: 0 };

        let completed = 0;
        const total = 5;

        // 1. Basic Info (visa type, location, occupation, employer)
        if (
          user.visa_type &&
          user.current_location?.city &&
          user.current_location?.state
        ) {
          completed++;
        }

        // 2. Background & Identity
        if (
          user.nationality &&
          user.languages &&
          user.languages.length > 0 &&
          user.other_us_jobs &&
          user.other_us_jobs.length > 0 &&
          user.relationship_status
        ) {
          completed++;
        }

        // 3. Lifestyle & Personality
        if (
          user.hobbies &&
          user.hobbies.length > 0 &&
          user.favorite_state &&
          user.preferred_outings &&
          user.preferred_outings.length > 0 &&
          user.has_car !== undefined &&
          user.offers_rides !== undefined
        ) {
          completed++;
        }

        // 4. Travel & Exploration
        if (
          user.road_trips !== undefined &&
          user.favorite_place &&
          user.travel_tips &&
          user.willing_to_guide !== undefined
        ) {
          completed++;
        }

        // 5. Knowledge & Community
        if (
          user.mentorship_interest !== undefined &&
          user.job_boards &&
          user.job_boards.length > 0 &&
          user.visa_advice
        ) {
          completed++;
        }

        const percentage = Math.floor((completed / total) * 100);
        return { completed, total, percentage };
      },
    }),
    {
      name: 'user-storage', // unique name for localStorage key
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        hasToken: state.hasToken,
      }), // only persist these fields
    }
  )
);

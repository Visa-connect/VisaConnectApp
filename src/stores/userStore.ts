import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// import { tokenRefreshService } from '../api/firebaseAuth'; // Temporarily disabled
import { useNotificationStore } from './notificationStore';

// User data interface
export interface UserData {
  uid: string;
  email: string;
  first_name?: string;
  last_name?: string;
  visa_type?: string;
  current_location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  occupation?: string;
  employer?: string;
  nationality?: string;
  languages?: string[];
  other_us_jobs?: string[];
  relationship_status?: string;
  hobbies?: string[];
  favorite_state?: string;
  preferred_outings?: string[];
  has_car?: boolean;
  offers_rides?: boolean;
  road_trips?: boolean;
  favorite_place?: string;
  travel_tips?: string;
  willing_to_guide?: boolean;
  mentorship_interest?: boolean;
  job_boards?: string[];
  visa_advice?: string;
  profile_photo_url?: string;
  profile_photo_public_id?: string;
  bio?: string;
}

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
  refreshToken: () => Promise<boolean>;

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
            set({ user, isAuthenticated: true, hasToken: true });

            // Fetch notifications if user is already authenticated
            const notificationStore = useNotificationStore.getState();
            if (notificationStore.shouldRefresh()) {
              notificationStore.fetchNotifications().catch((error) => {
                console.error('Failed to fetch notifications on init:', error);
              });
              notificationStore.fetchUnreadCount().catch((error) => {
                console.error('Failed to fetch unread count on init:', error);
              });
            }
          } catch (error) {
            console.error(
              'Failed to parse user data from localStorage:',
              error
            );
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

        // Fetch notifications after successful login
        if (hasToken) {
          const notificationStore = useNotificationStore.getState();
          notificationStore.fetchNotifications().catch((error) => {
            console.error('Failed to fetch notifications after login:', error);
          });
          notificationStore.fetchUnreadCount().catch((error) => {
            console.error('Failed to fetch unread count after login:', error);
          });
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
        set({ user: null, isAuthenticated: false, hasToken: false });
        // Clear localStorage
        localStorage.removeItem('userData');
        get().removeToken();
        // Clear token cache (temporarily disabled)
        // tokenRefreshService.clearCache();

        // Clear notifications when user logs out
        const notificationStore = useNotificationStore.getState();
        notificationStore.clearNotifications();
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

      refreshToken: async () => {
        // Token refresh temporarily disabled
        console.log('Token refresh is temporarily disabled');
        return false;
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

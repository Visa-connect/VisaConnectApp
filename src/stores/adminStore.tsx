import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Business } from '../api/businessApi';
import { TipsTripsAdvicePost } from '../api/adminTipsTripsAdviceService';
import { AdminUser } from '../api/adminUserService';
import { AdminEmployer } from '../api/adminEmployerService';

// Types
interface AdminState {
  businesses: Business[];
  businessCounts: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  tipsTripsAdvicePosts: TipsTripsAdvicePost[];
  selectedTipsTripsAdvicePost: TipsTripsAdvicePost | null;
  users: AdminUser[];
  userCounts: {
    all: number;
    active: number;
    verified: number;
    unverified: number;
  };
  selectedUser: AdminUser | null;
  employers: AdminEmployer[];
  selectedEmployer: AdminEmployer | null;
  loading: boolean;
  error: string | null;
}

type AdminAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BUSINESSES'; payload: Business[] }
  | { type: 'SET_COUNTS'; payload: AdminState['businessCounts'] }
  | { type: 'UPDATE_BUSINESS'; payload: Partial<Business> & { id: number } }
  | { type: 'SET_TIPS_TRIPS_ADVICE_POSTS'; payload: TipsTripsAdvicePost[] }
  | {
      type: 'SET_SELECTED_TIPS_TRIPS_ADVICE_POST';
      payload: TipsTripsAdvicePost | null;
    }
  | { type: 'SET_USERS'; payload: AdminUser[] }
  | { type: 'SET_USER_COUNTS'; payload: AdminState['userCounts'] }
  | { type: 'SET_SELECTED_USER'; payload: AdminUser | null }
  | { type: 'SET_EMPLOYERS'; payload: AdminEmployer[] }
  | { type: 'SET_SELECTED_EMPLOYER'; payload: AdminEmployer | null }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AdminState = {
  businesses: [],
  businessCounts: {
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  },
  tipsTripsAdvicePosts: [],
  selectedTipsTripsAdvicePost: null,
  users: [],
  userCounts: {
    all: 0,
    active: 0,
    verified: 0,
    unverified: 0,
  },
  selectedUser: null,
  employers: [],
  selectedEmployer: null,
  loading: false,
  error: null,
};

// Reducer
const adminReducer = (state: AdminState, action: AdminAction): AdminState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_BUSINESSES':
      return { ...state, businesses: action.payload, loading: false };
    case 'SET_COUNTS':
      return { ...state, businessCounts: action.payload };
    case 'UPDATE_BUSINESS':
      return {
        ...state,
        businesses: state.businesses.map((business) =>
          business.id === action.payload.id
            ? { ...business, ...action.payload }
            : business
        ),
      };
    case 'SET_TIPS_TRIPS_ADVICE_POSTS':
      return { ...state, tipsTripsAdvicePosts: action.payload };
    case 'SET_SELECTED_TIPS_TRIPS_ADVICE_POST':
      return { ...state, selectedTipsTripsAdvicePost: action.payload };
    case 'SET_USERS':
      return { ...state, users: action.payload, loading: false };
    case 'SET_USER_COUNTS':
      return { ...state, userCounts: action.payload };
    case 'SET_SELECTED_USER':
      return { ...state, selectedUser: action.payload };
    case 'SET_EMPLOYERS':
      return { ...state, employers: action.payload };
    case 'SET_SELECTED_EMPLOYER':
      return { ...state, selectedEmployer: action.payload };
    default:
      return state;
  }
};

// Context
const AdminContext = createContext<{
  state: AdminState;
  dispatch: React.Dispatch<AdminAction>;
} | null>(null);

// Provider component
export const AdminProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(adminReducer, initialState);

  return (
    <AdminContext.Provider value={{ state, dispatch }}>
      {children}
    </AdminContext.Provider>
  );
};

// Hook to use admin context
export const useAdminStore = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminStore must be used within an AdminProvider');
  }
  return context;
};

// Action creators
export const adminActions = {
  setLoading: (loading: boolean) => ({
    type: 'SET_LOADING' as const,
    payload: loading,
  }),
  setError: (error: string | null) => ({
    type: 'SET_ERROR' as const,
    payload: error,
  }),
  clearError: () => ({ type: 'CLEAR_ERROR' as const }),
  setBusinesses: (businesses: Business[]) => ({
    type: 'SET_BUSINESSES' as const,
    payload: businesses,
  }),
  setCounts: (counts: AdminState['businessCounts']) => ({
    type: 'SET_COUNTS' as const,
    payload: counts,
  }),
  updateBusiness: (business: Partial<Business> & { id: number }) => ({
    type: 'UPDATE_BUSINESS' as const,
    payload: business,
  }),
  setTipsTripsAdvicePosts: (posts: TipsTripsAdvicePost[]) => ({
    type: 'SET_TIPS_TRIPS_ADVICE_POSTS' as const,
    payload: posts,
  }),
  setSelectedTipsTripsAdvicePost: (post: TipsTripsAdvicePost | null) => ({
    type: 'SET_SELECTED_TIPS_TRIPS_ADVICE_POST' as const,
    payload: post,
  }),
  setUsers: (users: AdminUser[]) => ({
    type: 'SET_USERS' as const,
    payload: users,
  }),
  setUserCounts: (userCounts: AdminState['userCounts']) => ({
    type: 'SET_USER_COUNTS' as const,
    payload: userCounts,
  }),
  setSelectedUser: (user: AdminUser | null) => ({
    type: 'SET_SELECTED_USER' as const,
    payload: user,
  }),
  setEmployers: (employers: AdminEmployer[]) => ({
    type: 'SET_EMPLOYERS' as const,
    payload: employers,
  }),
  setSelectedEmployer: (employer: AdminEmployer | null) => ({
    type: 'SET_SELECTED_EMPLOYER' as const,
    payload: employer,
  }),
};

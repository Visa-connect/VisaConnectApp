import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Business } from '../api/businessApi';
import { TipsTripsAdvicePost } from '../api/adminTipsTripsAdviceService';

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
};

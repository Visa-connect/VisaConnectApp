// API-related type definitions

// Custom error type for API responses
export interface ApiError extends Error {
  status: number;
}

// Standardized error response from API
export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
}

// Common API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Consolidated user interface for authentication responses
export interface User {
  id: string;
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
  resume_url?: string;
  resume_filename?: string;
  resume_public_id?: string;
  timezone?: string;
}

// Authentication response interfaces
export interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
  token: string; // Firebase ID token for authenticated API calls
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user: User;
  token: string; // Firebase ID token for authenticated API calls
}

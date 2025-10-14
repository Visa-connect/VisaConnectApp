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

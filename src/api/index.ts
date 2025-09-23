import config from '../config';
import { useUserStore } from '../stores/userStore';
import { tokenRefreshService } from './firebaseAuth';
import { ApiError } from '../types/api';

// Backend API base URL
const API_BASE_URL = config.apiUrl;

export const getToken = () => {
  return useUserStore.getState().getToken();
};

const defaultHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

// Helper function to handle token refresh and retry requests
const handleTokenRefresh = async (
  originalRequest: () => Promise<Response>
): Promise<Response> => {
  const MAX_RETRIES = 2;
  const BASE_DELAY = 1000; // 1 second

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // First attempt with current token
      return await originalRequest();
    } catch (error: unknown) {
      const apiError = error as ApiError;

      // Check if it's a 401 error (unauthorized)
      if (apiError.status === 401) {
        console.log(
          'Token expired, but refresh is disabled - redirecting to sign in'
        );

        // Token refresh is disabled, user needs to re-authenticate
        useUserStore.getState().clearUser();
        throw new Error('Authentication expired. Please sign in again.');
      }

      // Check if it's a timeout error (408) and retry
      if (apiError.status === 408 && attempt < MAX_RETRIES) {
        console.warn(
          `Request timeout (attempt ${attempt}/${MAX_RETRIES}), retrying...`
        );
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Re-throw non-retryable errors
      throw error;
    }
  }

  // This should never be reached, but just in case
  throw new Error('Request failed after multiple retry attempts');
};

// Headers without authentication for registration/login
const publicHeaders = () => ({
  'Content-Type': 'application/json',
});

export async function apiGet<T>(url: string): Promise<T> {
  const makeRequest = async (): Promise<Response> => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      headers: defaultHeaders(),
    });
    if (!res.ok) {
      const error = new Error(await res.text()) as ApiError;
      error.status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest);
  return res.json();
}

export async function apiPost<T>(url: string, body: any): Promise<T> {
  const makeRequest = async (): Promise<Response> => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = new Error(await res.text()) as ApiError;
      error.status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest);
  return res.json();
}

// Public POST for registration/login (no auth required)
export async function apiPostPublic<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: publicHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorText = await res.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.message || errorData.error || 'Request failed');
    } catch {
      throw new Error(errorText || 'Request failed');
    }
  }
  return res.json();
}

export async function apiPatch<T>(url: string, body: any): Promise<T> {
  const makeRequest = async (): Promise<Response> => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PATCH',
      headers: defaultHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = new Error(await res.text()) as ApiError;
      error.status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest);
  return res.json();
}

export async function apiPut<T>(url: string, body: any): Promise<T> {
  const makeRequest = async (): Promise<Response> => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: defaultHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = new Error(await res.text()) as ApiError;
      error.status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest);
  return res.json();
}

export async function apiDelete<T>(url: string): Promise<T> {
  const makeRequest = async (): Promise<Response> => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: defaultHeaders(),
    });
    if (!res.ok) {
      const error = new Error(await res.text()) as ApiError;
      error.status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest);
  return res.json();
}

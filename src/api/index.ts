import config from '../config';
import { useUserStore } from '../stores/userStore';
import { tokenRefreshService } from './firebaseAuth';

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
  try {
    // First attempt with current token
    return await originalRequest();
  } catch (error: any) {
    // Check if it's a 401 error (unauthorized)
    if (error.status === 401 || error.message?.includes('401')) {
      console.log('Token expired, attempting to refresh...');

      // Try to refresh the token
      const refreshResult = await tokenRefreshService.refreshToken();

      if (refreshResult.success && refreshResult.token) {
        // Update the token in the store
        useUserStore.getState().setToken(refreshResult.token);

        // Retry the original request with the new token
        return await originalRequest();
      } else {
        // Token refresh failed, user needs to re-authenticate
        console.error('Token refresh failed:', refreshResult.error);
        useUserStore.getState().clearUser();
        throw new Error('Authentication expired. Please sign in again.');
      }
    }

    // Re-throw non-401 errors
    throw error;
  }
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
      const error = new Error(await res.text());
      (error as any).status = res.status;
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
      const error = new Error(await res.text());
      (error as any).status = res.status;
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
      const error = new Error(await res.text());
      (error as any).status = res.status;
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
      const error = new Error(await res.text());
      (error as any).status = res.status;
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
      const error = new Error(await res.text());
      (error as any).status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest);
  return res.json();
}

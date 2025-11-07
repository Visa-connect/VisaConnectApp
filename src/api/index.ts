import config from '../config';
import { useUserStore } from '../stores/userStore';
// import { tokenRefreshService } from './firebaseAuth'; // Temporarily disabled
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

const authorizationHeader = (): Record<string, string> => {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

// Helper function to handle token refresh and retry requests
const handleTokenRefresh = async (
  originalRequest: () => Promise<Response>
): Promise<Response> => {
  const MAX_RETRIES = 2;
  const BASE_DELAY = 1000; // 1 second
  const userStore = useUserStore.getState();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Attempt request with current token
      return await originalRequest();
    } catch (error: unknown) {
      const apiError = error as ApiError;

      if (apiError.status === 401) {
        const refreshed = await userStore.ensureValidToken();
        if (refreshed && attempt < MAX_RETRIES) {
          // Token refreshed successfully - retry the request
          continue;
        }

        // Refresh failed or max retries reached - clear auth state
        userStore.clearUser();
        throw new Error('Authentication expired. Please sign in again.');
      }

      if (apiError.status === 408 && attempt < MAX_RETRIES) {
        console.warn(
          `Request timeout (attempt ${attempt}/${MAX_RETRIES}), retrying...`
        );
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

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
  const jsonData = await res.json();
  return jsonData;
}

export async function apiPostFormData<T>(
  url: string,
  formData: FormData
): Promise<T> {
  const makeRequest = async (): Promise<Response> => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: authorizationHeader(),
      body: formData,
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

export async function apiPutFormData<T>(
  url: string,
  formData: FormData
): Promise<T> {
  const makeRequest = async (): Promise<Response> => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: authorizationHeader(),
      body: formData,
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

// Reset password function (public endpoint)
export async function resetPassword(
  email: string
): Promise<{ success: boolean; message: string }> {
  return apiPostPublic<{ success: boolean; message: string }>(
    '/api/auth/reset-password',
    { email }
  );
}

// Change email functions (authenticated endpoints)
export async function initiateEmailChange(
  newEmail: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  return apiPost<{ success: boolean; message: string }>(
    '/api/auth/change-email',
    { newEmail, password }
  );
}

export async function verifyEmailChange(
  verificationToken: string
): Promise<{ success: boolean; message: string }> {
  return apiPost<{ success: boolean; message: string }>(
    '/api/auth/verify-email-change',
    { verificationToken }
  );
}

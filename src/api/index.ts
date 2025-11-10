import * as Sentry from '@sentry/react';
import config from '../config';
import { useUserStore } from '../stores/userStore';
// import { tokenRefreshService } from './firebaseAuth'; // Temporarily disabled
import { ApiError } from '../types/api';

// Backend API base URL
const API_BASE_URL = config.apiUrl;

export const getToken = () => {
  return useUserStore.getState().getToken();
};

const buildJsonHeaders = (withAuth: boolean): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (withAuth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

const authorizationHeader = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

let refreshPromise: Promise<boolean> | null = null;

const waitForTokenRefresh = async (
  store: ReturnType<typeof useUserStore.getState>
): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = store.ensureValidToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

// Helper function to handle token refresh and retry requests
const handleTokenRefresh = async (
  originalRequest: () => Promise<Response>,
  url: string,
  method: string
): Promise<Response> => {
  const MAX_RETRIES = 2;
  const BASE_DELAY = 1000; // 1 second
  const userStore = useUserStore.getState();

  // Add breadcrumb for initial request
  if (process.env.REACT_APP_SENTRY_DSN && url) {
    Sentry.addBreadcrumb({
      category: 'http',
      message: `API request: ${method || 'GET'} ${url}`,
      level: 'info',
      data: {
        url,
        method: method || 'GET',
        attempt: 1,
      },
    });
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Attempt request with current token
      const response = await originalRequest();

      // Add breadcrumb for successful request
      if (process.env.REACT_APP_SENTRY_DSN && url) {
        Sentry.addBreadcrumb({
          category: 'http',
          message: `API request successful: ${method || 'GET'} ${url}`,
          level: 'info',
          data: {
            url,
            method: method || 'GET',
            status: response.status,
            attempt,
          },
        });
      }

      return response;
    } catch (error: unknown) {
      const apiError = error as ApiError;

      // Add breadcrumb for failed request
      if (process.env.REACT_APP_SENTRY_DSN && url) {
        Sentry.addBreadcrumb({
          category: 'http',
          message: `API request failed: ${method || 'GET'} ${url}`,
          level: 'error',
          data: {
            url,
            method: method || 'GET',
            status: apiError.status,
            attempt,
            maxRetries: MAX_RETRIES,
          },
        });
      }

      if (apiError.status === 401) {
        // Add breadcrumb for token refresh attempt
        if (process.env.REACT_APP_SENTRY_DSN) {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'Token refresh triggered due to 401',
            level: 'info',
            data: {
              attempt,
              url,
            },
          });
        }

        const refreshed = await waitForTokenRefresh(userStore);
        if (refreshed) {
          // Add breadcrumb for successful token refresh
          if (process.env.REACT_APP_SENTRY_DSN) {
            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'Token refresh successful, retrying request',
              level: 'info',
              data: {
                attempt,
                url,
              },
            });
          }
          // Do not count this attempt since we refreshed the token
          attempt--;
          continue;
        }

        // Refresh failed or max retries reached - clear auth state
        if (process.env.REACT_APP_SENTRY_DSN) {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'Token refresh failed, clearing auth state',
            level: 'error',
            data: {
              attempt,
              url,
            },
          });
        }
        userStore.clearUser();
        throw new Error('Authentication expired. Please sign in again.');
      }

      if (apiError.status === 408 && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);

        // Add breadcrumb for timeout retry
        if (process.env.REACT_APP_SENTRY_DSN && url) {
          Sentry.addBreadcrumb({
            category: 'http',
            message: `Request timeout, retrying after ${delay}ms`,
            level: 'warning',
            data: {
              url,
              method: method || 'GET',
              attempt,
              delay,
              maxRetries: MAX_RETRIES,
            },
          });
        }

        console.warn(
          `Request timeout (attempt ${attempt}/${MAX_RETRIES}), retrying...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  // Add breadcrumb for final failure
  if (process.env.REACT_APP_SENTRY_DSN && url) {
    Sentry.addBreadcrumb({
      category: 'http',
      message: `API request failed after ${MAX_RETRIES} retries`,
      level: 'error',
      data: {
        url,
        method: method || 'GET',
        maxRetries: MAX_RETRIES,
      },
    });
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
      headers: buildJsonHeaders(true),
      credentials: 'include',
    });
    if (!res.ok) {
      const error = new Error(await res.text()) as ApiError;
      error.status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest, url, 'GET');
  return res.json();
}

interface ApiPostOptions {
  skipAuth?: boolean;
  headers?: Record<string, string>;
}

export async function apiPost<T>(
  url: string,
  body: any,
  options: ApiPostOptions = {}
): Promise<T> {
  const makeRequest = async (): Promise<Response> => {
    const { skipAuth = false, headers = {} } = options;
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        ...buildJsonHeaders(!skipAuth),
        ...headers,
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    if (!res.ok) {
      const error = new Error(await res.text()) as ApiError;
      error.status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest, url, 'POST');
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
      credentials: 'include',
    });
    if (!res.ok) {
      const error = new Error(await res.text()) as ApiError;
      error.status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest, url, 'POST');
  return res.json();
}

// Public POST for registration/login (no auth required)
export async function apiPostPublic<T>(url: string, body: any): Promise<T> {
  // Add breadcrumb for public API request
  if (process.env.REACT_APP_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category: 'http',
      message: `Public API request: POST ${url}`,
      level: 'info',
      data: {
        url,
        method: 'POST',
        endpoint: url,
      },
    });
  }

  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: publicHeaders(),
    body: JSON.stringify(body),
    credentials: 'include',
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = 'Request failed';

    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error || 'Request failed';
    } catch {
      errorMessage = errorText || 'Request failed';
    }

    // Add breadcrumb for failed public API request
    if (process.env.REACT_APP_SENTRY_DSN) {
      Sentry.addBreadcrumb({
        category: 'http',
        message: `Public API request failed: POST ${url}`,
        level: 'error',
        data: {
          url,
          method: 'POST',
          status: res.status,
          error: errorMessage,
        },
      });
    }

    throw new Error(errorMessage);
  }

  // Add breadcrumb for successful public API request
  if (process.env.REACT_APP_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category: 'http',
      message: `Public API request successful: POST ${url}`,
      level: 'info',
      data: {
        url,
        method: 'POST',
        status: res.status,
      },
    });
  }

  return res.json();
}

export async function apiPatch<T>(url: string, body: any): Promise<T> {
  const makeRequest = async (): Promise<Response> => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PATCH',
      headers: buildJsonHeaders(true),
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = new Error(await res.text()) as ApiError;
      error.status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest, url, 'PATCH');
  return res.json();
}

export async function apiPut<T>(url: string, body: any): Promise<T> {
  const makeRequest = async (): Promise<Response> => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: buildJsonHeaders(true),
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = new Error(await res.text()) as ApiError;
      error.status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest, url, 'PUT');
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
      credentials: 'include',
    });
    if (!res.ok) {
      const error = new Error(await res.text()) as ApiError;
      error.status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest, url, 'PUT');
  return res.json();
}

export async function apiDelete<T>(url: string): Promise<T> {
  const makeRequest = async (): Promise<Response> => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: buildJsonHeaders(true),
      credentials: 'include',
    });
    if (!res.ok) {
      const error = new Error(await res.text()) as ApiError;
      error.status = res.status;
      throw error;
    }
    return res;
  };

  const res = await handleTokenRefresh(makeRequest, url, 'DELETE');
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

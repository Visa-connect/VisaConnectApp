import config from '../config';
import { useUserStore } from '../stores/userStore';

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

// Headers without authentication for registration/login
const publicHeaders = () => ({
  'Content-Type': 'application/json',
});

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    headers: defaultHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: defaultHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
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
  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: 'PATCH',
    headers: defaultHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPut<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: 'PUT',
    headers: defaultHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: 'DELETE',
    headers: defaultHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

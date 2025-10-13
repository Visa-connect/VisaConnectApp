import config from '../config';

// Backend API base URL
const API_BASE_URL = config.apiUrl;

export const getAdminToken = () => {
  return localStorage.getItem('adminToken');
};

const adminHeaders = () => {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export async function adminApiGet<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function adminApiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function adminApiPostFormData<T>(
  url: string,
  formData: FormData
): Promise<T> {
  const token = getAdminToken();
  if (!token) {
    throw new Error('No admin authentication token found');
  }

  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type - let browser set it with boundary for FormData
    },
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function adminApiPut<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function adminApiDelete<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

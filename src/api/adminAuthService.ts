import { apiPost } from './index';
import config from '../config';

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    uid: string;
    email: string;
    displayName?: string;
  };
  code?: string;
}

export interface AdminVerifyResponse {
  success: boolean;
  message: string;
  user?: {
    uid: string;
    email: string;
    admin: boolean;
    role: string;
  };
  code?: string;
}

class AdminAuthService {
  // Login admin user
  async login(email: string, password: string): Promise<AdminLoginResponse> {
    const response: AdminLoginResponse = await apiPost(
      '/api/admin/auth/login',
      {
        email,
        password,
      }
    );
    return response;
  }

  // Logout admin user
  async logout(): Promise<{ success: boolean; message: string }> {
    const response = (await apiPost('/api/admin/auth/logout', {})) as {
      success: boolean;
      message: string;
    };
    return response;
  }

  // Verify admin token
  async verifyToken(token: string): Promise<AdminVerifyResponse> {
    const response = await fetch(`${config.apiUrl}/api/admin/auth/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: AdminVerifyResponse = await response.json();
    return data;
  }
}

export const adminAuthService = new AdminAuthService();

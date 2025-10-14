import { useState, useEffect } from 'react';
import { adminAuthService } from '../api/adminAuthService';
import { ApiErrorResponse, ApiResponse } from '../types/api';

interface AdminAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<ApiResponse | ApiErrorResponse>;
  logout: () => void;
}

export const useAdminAuth = (): AdminAuthState => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if admin is authenticated on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          const response = await adminAuthService.verifyToken(token);
          setIsAuthenticated(response.success);
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('adminToken');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<ApiResponse | ApiErrorResponse> => {
    try {
      // Clear all existing tokens and user information
      localStorage.clear();

      const response = await adminAuthService.login(email, password);
      if (response.success && response.token) {
        // Store admin token and user info
        localStorage.setItem('adminToken', response.token);
        if (response.user) {
          localStorage.setItem('adminUser', JSON.stringify(response.user));
        }
        setIsAuthenticated(true);
        return response;
      }
      return response;
    } catch (error) {
      console.error('useAdminAuth: Login error:', error);
      return error as ApiErrorResponse;
    }
  };

  const logout = async () => {
    try {
      await adminAuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all localStorage data on logout
      localStorage.clear();
      setIsAuthenticated(false);
      console.log(
        'useAdminAuth: Logout complete, cleared all localStorage data'
      );
    }
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
};

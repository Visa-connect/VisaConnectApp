import { useState, useEffect } from 'react';
import { adminAuthService } from '../api/adminAuthService';

interface AdminAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('useAdminAuth: Attempting login for', email);

      // Clear all existing tokens and user information
      localStorage.clear();
      console.log('useAdminAuth: Cleared all localStorage data');

      const response = await adminAuthService.login(email, password);
      console.log('useAdminAuth: Login response', response);
      if (response.success && response.token) {
        // Store admin token and user info
        localStorage.setItem('adminToken', response.token);
        if (response.user) {
          localStorage.setItem('adminUser', JSON.stringify(response.user));
        }
        setIsAuthenticated(true);
        console.log(
          'useAdminAuth: Login successful, isAuthenticated set to true'
        );
        return true;
      }
      console.log('useAdminAuth: Login failed - no success or token');
      return false;
    } catch (error) {
      console.error('useAdminAuth: Login error:', error);
      return false;
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

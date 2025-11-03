import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';

interface AuthenticatedRouteProps {
  children: React.ReactNode;
}

const AuthenticatedRoute: React.FC<AuthenticatedRouteProps> = ({
  children,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, hasToken, init } = useUserStore();

  useEffect(() => {
    // Initialize the store to check for existing tokens
    init();
  }, [init]);

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated && !hasToken) {
      // Redirect to root route if not authenticated
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, hasToken, navigate]);

  // Show loading state while checking authentication
  if (!isAuthenticated && !hasToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Render children if authenticated
  return <>{children}</>;
};

export default AuthenticatedRoute;

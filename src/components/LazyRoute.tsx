import React, { Suspense, ReactNode } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LazyRouteProps {
  children: ReactNode;
}

/**
 * Wrapper component for lazy-loaded routes
 * Provides Suspense boundary with loading spinner for code-split routes
 */
const LazyRoute: React.FC<LazyRouteProps> = ({ children }) => {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
};

export default LazyRoute;


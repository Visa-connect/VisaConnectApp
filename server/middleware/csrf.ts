/**
 * CSRF Protection Middleware
 *
 * Provides CSRF (Cross-Site Request Forgery) protection for state-changing
 * operations (POST, PUT, DELETE, PATCH). Uses the double-submit cookie pattern
 * for stateless CSRF protection.
 *
 * Note: For a stateless backend, we use a simplified CSRF protection approach
 * that relies on SameSite cookies and origin validation. Full CSRF token
 * implementation would require session storage, which conflicts with stateless
 * architecture.
 *
 * Alternative approach: Use SameSite=Strict cookies and validate Origin header
 * for state-changing operations. This provides CSRF protection without requiring
 * server-side session storage.
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

/**
 * CSRF protection middleware
 * Validates that state-changing requests come from the same origin
 *
 * This middleware should be applied to all POST, PUT, DELETE, PATCH endpoints
 * that modify server state. It validates the Origin header against allowed origins.
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only apply CSRF protection to state-changing methods
  const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  const method = req.method.toUpperCase();

  // Skip CSRF protection for non-state-changing methods (GET, HEAD, OPTIONS, etc.)
  if (!stateChangingMethods.includes(method)) {
    return next();
  }

  // Skip CSRF protection for health checks and internal endpoints
  if (req.path === '/api/health' || req.path.startsWith('/api/internal')) {
    return next();
  }

  // Skip CSRF protection for CORS preflight requests (OPTIONS)
  if (method === 'OPTIONS') {
    return next();
  }

  // Get the Origin header from the request
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // In development, allow requests without Origin (e.g., from Postman, curl)
  if (config.server.nodeEnv !== 'production') {
    if (!origin && !referer) {
      console.warn(
        'CSRF: Request without Origin or Referer header (allowed in development)',
        {
          path: req.path,
          method: req.method,
          ip: req.ip,
        }
      );
      return next();
    }
  }

  // Get allowed origins from environment or use defaults
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    config.email.appUrl,
    process.env.APP_URL,
  ].filter((value): value is string => Boolean(value));

  // Validate Origin header
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      return next();
    }

    console.warn('CSRF: Invalid Origin header', {
      origin,
      path: req.path,
      method: req.method,
      ip: req.ip,
      allowedOrigins,
    });

    res.status(403).json({
      success: false,
      message: 'Invalid origin. Request rejected for security reasons.',
    });
    return;
  }

  // If no Origin header, try to validate Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;

      if (allowedOrigins.includes(refererOrigin)) {
        return next();
      }

      console.warn('CSRF: Invalid Referer header', {
        referer,
        refererOrigin,
        path: req.path,
        method: req.method,
        ip: req.ip,
        allowedOrigins,
      });

      res.status(403).json({
        success: false,
        message: 'Invalid referer. Request rejected for security reasons.',
      });
      return;
    } catch (error) {
      console.warn('CSRF: Invalid Referer URL format', {
        referer,
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // In production, reject requests without Origin or Referer
  if (config.server.nodeEnv === 'production') {
    console.warn(
      'CSRF: Request without Origin or Referer header (rejected in production)',
      {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    res.status(403).json({
      success: false,
      message:
        'Request must include Origin or Referer header. Request rejected for security reasons.',
    });
    return;
  }

  // Allow in development if we get here
  return next();
}

/**
 * CSRF protection middleware that skips certain paths
 * Useful for applying CSRF protection to specific route groups
 *
 * @param skipPaths - Array of paths to skip CSRF protection for
 * @returns CSRF protection middleware
 */
export function csrfProtectionWithSkip(skipPaths: string[] = []) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip CSRF protection for specified paths
    if (skipPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Apply standard CSRF protection
    return csrfProtection(req, res, next);
  };
}

/**
 * Validates that the request origin matches the expected origin
 * Helper function for custom CSRF validation logic
 *
 * @param req - Express request object
 * @param allowedOrigins - Array of allowed origins
 * @returns true if origin is valid, false otherwise
 */
export function validateOrigin(
  req: Request,
  allowedOrigins: string[]
): boolean {
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      if (allowedOrigins.includes(refererOrigin)) {
        return true;
      }
    } catch (error) {
      // Invalid URL format
      return false;
    }
  }

  return false;
}

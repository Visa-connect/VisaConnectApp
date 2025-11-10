/**
 * CSRF Protection Middleware
 *
 * Provides CSRF (Cross-Site Request Forgery) protection for state-changing
 * operations (POST, PUT, DELETE, PATCH). Uses CSRF tokens with the double-submit
 * cookie pattern for stateless CSRF protection.
 *
 * Implementation:
 * - Generates CSRF tokens on GET requests and sets them in cookies
 * - Validates CSRF tokens on state-changing operations
 * - Uses Origin/Referer validation as defense-in-depth
 * - Works with stateless backend architecture
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import Tokens from 'csrf';

// CSRF token cookie and header names
const CSRF_TOKEN_COOKIE = '_csrf';
const CSRF_TOKEN_HEADER = 'x-csrf-token';

// Initialize CSRF token generator/validator
// The csrf package generates secrets per token (double-submit cookie pattern)
// This works with stateless backends - secret is stored in cookie, token in header/body
const tokens = new Tokens();

/**
 * Get allowed origins from environment or use defaults
 */
function getAllowedOrigins(): string[] {
  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    config.email.appUrl,
    process.env.APP_URL,
  ].filter((value): value is string => Boolean(value));
}

/**
 * Validates Origin/Referer header as defense-in-depth
 * This is a secondary check - CSRF tokens are the primary protection
 */
function validateOriginHeader(req: Request, allowedOrigins: string[]): boolean {
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

/**
 * CSRF token generation middleware
 * Generates and sets CSRF tokens on GET requests
 * Should be applied before routes that need CSRF protection
 */
export function csrfTokenGenerator(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only generate tokens for GET requests
  if (req.method.toUpperCase() !== 'GET') {
    return next();
  }

  // Skip token generation for health checks and internal endpoints
  if (req.path === '/api/health' || req.path.startsWith('/api/internal')) {
    return next();
  }

  // Skip token generation for static assets and API documentation
  if (
    req.path.startsWith('/static') ||
    req.path.startsWith('/api/docs') ||
    req.path.endsWith('.json')
  ) {
    return next();
  }

  try {
    // Generate a new CSRF token
    const secret = tokens.secretSync();
    const token = tokens.create(secret);

    // Set the token in a cookie (httpOnly for security)
    const isProduction = config.server.nodeEnv === 'production';
    res.cookie(CSRF_TOKEN_COOKIE, secret, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    // Also set the token in a response header for client-side access
    res.setHeader(CSRF_TOKEN_HEADER, token);

    // Store token in response locals for potential use in templates
    res.locals.csrfToken = token;
  } catch (error) {
    console.error('CSRF: Error generating token', {
      path: req.path,
      method: req.method,
      error: error instanceof Error ? error.message : String(error),
    });
    // Continue even if token generation fails (will be caught by validation)
  }

  next();
}

/**
 * CSRF protection middleware
 * Validates CSRF tokens on state-changing operations
 *
 * This middleware should be applied to all POST, PUT, DELETE, PATCH endpoints
 * that modify server state. It validates CSRF tokens and Origin headers.
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

  // Skip CSRF protection for public authentication endpoints
  // These endpoints need to accept cross-origin requests and don't require CSRF tokens
  const publicAuthEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh-token',
    '/api/auth/reset-password',
  ];
  if (publicAuthEndpoints.includes(req.path)) {
    return next();
  }

  // Get CSRF token from header or body
  const tokenFromHeader = req.headers[CSRF_TOKEN_HEADER.toLowerCase()] as
    | string
    | undefined;
  const tokenFromBody = req.body?._csrf as string | undefined;
  const csrfToken = tokenFromHeader || tokenFromBody;

  // Get CSRF secret from cookie
  const secret = req.cookies?.[CSRF_TOKEN_COOKIE];

  // Validate CSRF token
  if (!csrfToken || !secret) {
    console.warn('CSRF: Missing CSRF token or secret', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      hasToken: !!csrfToken,
      hasSecret: !!secret,
    });

    res.status(403).json({
      success: false,
      message: 'CSRF token missing. Request rejected for security reasons.',
    });
    return;
  }

  try {
    // Verify the CSRF token
    if (!tokens.verify(secret, csrfToken)) {
      console.warn('CSRF: Invalid CSRF token', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(403).json({
        success: false,
        message: 'Invalid CSRF token. Request rejected for security reasons.',
      });
      return;
    }
  } catch (error) {
    console.warn('CSRF: Error verifying token', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(403).json({
      success: false,
      message:
        'CSRF token validation failed. Request rejected for security reasons.',
    });
    return;
  }

  // Defense-in-depth: Also validate Origin/Referer header
  // This provides additional protection even if tokens are compromised
  const allowedOrigins = getAllowedOrigins();
  const isProduction = config.server.nodeEnv === 'production';

  // In production, require Origin/Referer validation
  if (isProduction) {
    if (!validateOriginHeader(req, allowedOrigins)) {
      console.warn('CSRF: Invalid Origin/Referer header (production)', {
        origin: req.headers.origin,
        referer: req.headers.referer,
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
  } else {
    // In development, warn but allow (for testing with Postman, curl, etc.)
    if (!validateOriginHeader(req, allowedOrigins)) {
      console.warn(
        'CSRF: Invalid Origin/Referer header (development - allowed)',
        {
          origin: req.headers.origin,
          referer: req.headers.referer,
          path: req.path,
          method: req.method,
          ip: req.ip,
          allowedOrigins,
        }
      );
      // Continue in development - token validation is sufficient
    }
  }

  // Token and origin validation passed
  next();
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
  return validateOriginHeader(req, allowedOrigins);
}

/**
 * Get CSRF token from response (for use in templates or API responses)
 * Should be called after csrfTokenGenerator middleware
 */
export function getCsrfToken(res: Response): string | undefined {
  return res.locals.csrfToken;
}

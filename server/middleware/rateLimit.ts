/**
 * Rate Limiting Middleware
 *
 * Provides rate limiting for public authentication endpoints to prevent
 * brute force attacks and abuse. Implements different rate limits for
 * different endpoints based on their security sensitivity.
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Standard rate limiter for authentication endpoints
 * Limits: 5 requests per 15 minutes per IP
 * Used for: login, register, refresh-token, reset-password
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use IP address from request (works behind proxies if trust proxy is set)
  // ipKeyGenerator properly handles IPv6 addresses and prevents bypass attacks
  keyGenerator: (req: Request): string => {
    // req.ip is set correctly when trust proxy is enabled in Express
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
  },
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response) => {
    console.warn('Rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      // Don't log sensitive information (email, userAgent) to protect user privacy
    });

    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
    });
  },
  // Skip rate limiting for certain conditions (e.g., health checks)
  skip: (req: Request): boolean => {
    // Skip rate limiting for health checks
    if (req.path === '/api/health') {
      return true;
    }
    return false;
  },
});

/**
 * Stricter rate limiter for sensitive operations
 * Limits: 3 requests per 15 minutes per IP
 * Used for: password reset, email change verification
 */
export const sensitiveAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // req.ip is set correctly when trust proxy is enabled in Express
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
  },
  handler: (req: Request, res: Response) => {
    console.warn('Sensitive rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      // Don't log sensitive information (email, userAgent) to protect user privacy
    });

    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
    });
  },
});

/**
 * Login-specific rate limiter
 * Limits: 5 requests per 15 minutes per IP
 * Used for: login endpoint (most targeted by brute force attacks)
 *
 * Note: Uses IP-only rate limiting to prevent attackers from bypassing limits
 * by using different email addresses. This ensures that all login attempts from
 * a single IP are counted together, regardless of which email is targeted.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Use IP-only rate limiting to prevent bypass attacks
    // An attacker cannot bypass the rate limit by using different emails
    // ipKeyGenerator properly handles IPv6 addresses and prevents bypass attacks
    // req.ip is set correctly when trust proxy is enabled in Express
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
  },
  handler: (req: Request, res: Response) => {
    console.warn('Login rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      // Don't log sensitive information (email, userAgent) to protect user privacy
    });

    res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP, please try again later.',
      retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
    });
  },
});

/**
 * Register-specific rate limiter
 * Limits: 3 requests per hour per IP
 * Used for: registration endpoint (prevent spam accounts)
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registrations per hour
  message: {
    success: false,
    message:
      'Too many registration attempts from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // req.ip is set correctly when trust proxy is enabled in Express
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
  },
  handler: (req: Request, res: Response) => {
    console.warn('Registration rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      // Don't log sensitive information (email, userAgent) to protect user privacy
    });

    res.status(429).json({
      success: false,
      message:
        'Too many registration attempts from this IP, please try again later.',
      retryAfter: Math.ceil(60 * 60), // 1 hour in seconds
    });
  },
});

/**
 * Refresh token rate limiter
 * Limits: 10 requests per 15 minutes per IP
 * Used for: refresh-token endpoint (less sensitive, but still needs protection)
 */
export const refreshTokenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 refresh token requests per windowMs
  message: {
    success: false,
    message:
      'Too many token refresh requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // req.ip is set correctly when trust proxy is enabled in Express
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
  },
  handler: (req: Request, res: Response) => {
    console.warn('Refresh token rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      // Don't log sensitive information (email, userAgent) to protect user privacy
    });

    res.status(429).json({
      success: false,
      message:
        'Too many token refresh requests from this IP, please try again later.',
      retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
    });
  },
});

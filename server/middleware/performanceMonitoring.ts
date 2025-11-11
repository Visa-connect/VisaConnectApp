/**
 * Performance Monitoring Middleware
 *
 * Tracks API response times and logs slow requests for performance optimization.
 * Integrates with Sentry for performance monitoring and alerting.
 */

import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

// Threshold for slow requests (in milliseconds)
const SLOW_REQUEST_THRESHOLD = 400; // p95 target: <400ms

interface PerformanceMetrics {
  startTime: number;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
}

/**
 * Normalize a path by replacing parameter values with placeholders
 * This helps aggregate metrics for the same endpoint regardless of parameter values
 *
 * Normalization rules:
 * - UUIDs: Always normalized (e.g., 550e8400-e29b-41d4-a716-446655440000 -> :id)
 * - Numeric IDs: Multi-digit numbers (2+ digits) normalized (e.g., 123 -> :id)
 * - Alphanumeric IDs: 8+ chars with 2+ digits normalized (e.g., abc-123-def -> :id)
 * - Route segments: Preserved (e.g., electronics1, categories -> unchanged)
 *
 * Examples:
 * - /users/123 -> /users/:id
 * - /posts/abc-123-def -> /posts/:id
 * - /api/jobs/456/comments -> /api/jobs/:id/comments
 * - /categories/electronics1 -> /categories/electronics1 (preserved, single digit)
 * - /categories/electronics-gadgets -> /categories/electronics-gadgets (preserved, no digits)
 */
const normalizePath = (path: string): string => {
  // Split path into segments for more accurate normalization
  const segments = path.split('/');

  const normalizedSegments = segments.map((segment) => {
    // Skip empty segments (from leading/trailing slashes)
    if (!segment) return segment;

    // UUID pattern: 8-4-4-4-12 hex characters (case-insensitive)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(segment)) {
      return ':id';
    }

    // Numeric ID: multi-digit numbers (2+ digits)
    const numericIdPattern = /^\d{2,}$/;
    if (numericIdPattern.test(segment)) {
      return ':id';
    }

    // Alphanumeric ID: patterns that are clearly IDs, not route segments
    // Matches patterns like "abc-123-def" or "post-123-456" but not "electronics1"
    // Requirements:
    // - 8+ characters (long enough to be an ID, not a common word)
    // - Contains 2+ digits (multiple digits suggest an ID, not a word with a suffix)
    // - Alphanumeric with hyphens allowed
    const alphanumericIdPattern = /^[a-z0-9-]{8,}$/i;
    const digitCount = (segment.match(/\d/g) || []).length;
    if (alphanumericIdPattern.test(segment) && digitCount >= 2) {
      return ':id';
    }

    // Keep original segment if it doesn't match ID patterns
    return segment;
  });

  return normalizedSegments.join('/');
};

/**
 * Get normalized path for performance monitoring
 * Prefers route pattern (req.route?.path) which already has placeholders,
 * otherwise normalizes the actual path to replace parameter values
 */
const getNormalizedPath = (req: Request): string => {
  // Prefer route pattern if available (already normalized with :param placeholders)
  if (req.route?.path) {
    return req.route.path;
  }

  // Fall back to normalizing the actual path
  if (req.path) {
    return normalizePath(req.path);
  }

  return 'unknown';
};

/**
 * Performance monitoring middleware
 * Tracks request duration and reports slow requests to Sentry
 */
export const performanceMonitoring = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const metrics: PerformanceMetrics = {
    startTime,
    method: req.method,
    path: getNormalizedPath(req),
  };

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    metrics.duration = duration;
    metrics.statusCode = res.statusCode;

    // Report to Sentry for performance monitoring
    // Note: Sentry v10 metrics.distribution doesn't support tags in options
    // Metadata is included in breadcrumbs and context for filtering
    Sentry.metrics.distribution('http.server.request.duration', duration, {
      unit: 'millisecond',
    });

    // Add breadcrumb with request details for context
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${metrics.method} ${metrics.path} - ${duration}ms`,
      level: duration > SLOW_REQUEST_THRESHOLD ? 'warning' : 'info',
      data: {
        method: metrics.method,
        path: metrics.path,
        statusCode: metrics.statusCode,
        duration,
        slow: duration > SLOW_REQUEST_THRESHOLD,
        threshold: SLOW_REQUEST_THRESHOLD,
      },
    });

    // Log slow requests to console
    if (duration > SLOW_REQUEST_THRESHOLD) {
      console.warn(
        `Slow request detected: ${metrics.method} ${metrics.path} - ${duration}ms (Status: ${metrics.statusCode})`
      );
    }
  });

  next();
};

export default performanceMonitoring;

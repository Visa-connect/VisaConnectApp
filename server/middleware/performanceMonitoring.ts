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
    path: req.path || req.route?.path || 'unknown',
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

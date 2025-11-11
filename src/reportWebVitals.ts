import { ReportHandler, Metric } from 'web-vitals';
import * as Sentry from '@sentry/react';

/**
 * Reports Core Web Vitals metrics to both console and Sentry
 * This helps track performance metrics and identify performance issues
 */
const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(
      ({ getCLS, getFID, getFCP, getLCP, getTTFB, getINP }) => {
        // Helper to report metrics to Sentry
        const reportToSentry = (metric: Metric) => {
          // Calculate rating if not available (fallback for compatibility)
          const rating =
            'rating' in metric && metric.rating
              ? metric.rating
              : metric.value <
                (metric.name === 'CLS'
                  ? 0.1
                  : metric.name === 'FCP'
                  ? 1800
                  : metric.name === 'LCP'
                  ? 2500
                  : metric.name === 'INP'
                  ? 200
                  : metric.name === 'TTFB'
                  ? 800
                  : 1000)
              ? 'good'
              : 'poor';

          // Only report to Sentry if DSN is configured
          if (process.env.REACT_APP_SENTRY_DSN) {
            // Determine unit based on metric type
            const unit = metric.name === 'CLS' ? 'none' : 'millisecond';

            // Record metric distribution using Sentry v10 API
            // Note: Sentry v10 metrics.distribution doesn't support tags in options
            // Tags should be set at the scope level if needed for filtering
            Sentry.metrics.distribution(
              `web_vital.${metric.name.toLowerCase()}`,
              metric.value,
              {
                unit: unit,
              }
            );

            // Add breadcrumb with metric details for context
            Sentry.addBreadcrumb({
              category: 'web-vitals',
              message: `${metric.name}: ${metric.value}${
                unit === 'millisecond' ? 'ms' : ''
              }`,
              level: rating === 'poor' ? 'warning' : 'info',
              data: {
                name: metric.name,
                value: metric.value,
                rating: rating,
                id: metric.id,
                unit: unit,
              },
            });
          }

          // Also call the original handler if provided
          // Type assertion needed because ReportHandler is a union type expecting specific metric types
          if (onPerfEntry) {
            onPerfEntry(metric as Parameters<ReportHandler>[0]);
          }
        };

        // Track all Core Web Vitals metrics
        getCLS(reportToSentry); // Cumulative Layout Shift
        getFID(reportToSentry); // First Input Delay (deprecated, use INP)
        getFCP(reportToSentry); // First Contentful Paint
        getLCP(reportToSentry); // Largest Contentful Paint
        getTTFB(reportToSentry); // Time to First Byte
        getINP(reportToSentry); // Interaction to Next Paint (replaces FID)
      }
    );
  }
};

export default reportWebVitals;

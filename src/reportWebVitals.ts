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
        /**
         * Calculate Core Web Vitals rating based on official thresholds
         * Returns: 'good' | 'needs-improvement' | 'poor'
         *
         * Official thresholds (75th percentile):
         * - LCP: Good ≤ 2.5s, Needs Improvement > 2.5s and ≤ 4s, Poor > 4s
         * - INP: Good ≤ 200ms, Needs Improvement > 200ms and ≤ 500ms, Poor > 500ms
         * - CLS: Good ≤ 0.1, Needs Improvement > 0.1 and ≤ 0.25, Poor > 0.25
         * - FCP: Good ≤ 1.8s, Needs Improvement > 1.8s and ≤ 3s, Poor > 3s
         * - TTFB: Good ≤ 800ms, Needs Improvement > 800ms and ≤ 1.8s, Poor > 1.8s
         */
        const calculateRating = (
          name: string,
          value: number
        ): 'good' | 'needs-improvement' | 'poor' => {
          switch (name) {
            case 'LCP':
              if (value <= 2500) return 'good';
              if (value <= 4000) return 'needs-improvement';
              return 'poor';

            case 'INP':
              if (value <= 200) return 'good';
              if (value <= 500) return 'needs-improvement';
              return 'poor';

            case 'CLS':
              if (value <= 0.1) return 'good';
              if (value <= 0.25) return 'needs-improvement';
              return 'poor';

            case 'FCP':
              if (value <= 1800) return 'good';
              if (value <= 3000) return 'needs-improvement';
              return 'poor';

            case 'TTFB':
              if (value <= 800) return 'good';
              if (value <= 1800) return 'needs-improvement';
              return 'poor';

            case 'FID':
              // FID is deprecated but still tracked
              if (value <= 100) return 'good';
              if (value <= 300) return 'needs-improvement';
              return 'poor';

            default:
              // Fallback for unknown metrics
              return 'good';
          }
        };

        // Helper to report metrics to Sentry
        const reportToSentry = (metric: Metric) => {
          // Use rating from metric if available (web-vitals v3+), otherwise calculate it
          // The Metric type in web-vitals v3+ includes rating as 'good' | 'needs-improvement' | 'poor'
          const rating: 'good' | 'needs-improvement' | 'poor' =
            'rating' in metric && metric.rating
              ? metric.rating
              : calculateRating(metric.name, metric.value);

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
            // Set log level based on rating: poor = error, needs-improvement = warning, good = info
            const logLevel =
              rating === 'poor'
                ? 'error'
                : rating === 'needs-improvement'
                ? 'warning'
                : 'info';

            Sentry.addBreadcrumb({
              category: 'web-vitals',
              message: `${metric.name}: ${metric.value}${
                unit === 'millisecond' ? 'ms' : ''
              } (${rating})`,
              level: logLevel,
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

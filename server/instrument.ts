import * as Sentry from '@sentry/node';
import { httpIntegration, expressIntegration } from '@sentry/node';
import { config } from './config/env';

Sentry.init({
  dsn: config.sentryDsn,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [httpIntegration(), expressIntegration()],
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request) {
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      if (event.request.data) {
        // Remove password fields
        if (typeof event.request.data === 'object') {
          const sanitized = { ...event.request.data };
          if ('password' in sanitized) {
            sanitized.password = '[REDACTED]';
          }
          event.request.data = sanitized;
        }
      }
    }
    return event;
  },
});

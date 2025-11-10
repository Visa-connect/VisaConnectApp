import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { browserTracingIntegration, replayIntegration } from '@sentry/react';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { config } from './config';
import ErrorBoundary from './components/ErrorBoundary';

// Initialize Sentry for error tracking (if DSN is provided)
if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      browserTracingIntegration(),
      replayIntegration({
        // Session Replay for debugging
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Set tracing origins to track performance
    tracePropagationTargets: ['localhost', /^https:\/\/.*\.visaconnectus\.com/],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
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
  console.log('✅ Sentry initialized for error tracking');
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register service worker for PWA functionality
serviceWorkerRegistration.register();

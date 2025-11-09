import path from 'path';
import fs from 'fs';
import express, { Express, Request, Response } from 'express';
import cors, { CorsOptions, CorsOptionsDelegate } from 'cors';
import admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import { WebSocketService } from './services/websocketService';

// Database connection
import pool from './db/config';
// Register API routes
import { registerApiRoutes } from './api';

// Initialize Firebase Admin SDK FIRST
let serviceAccount: ServiceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Staging/Production: Use environment variable
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Using Firebase service account from environment variable');
  } catch (error: any) {
    console.error(
      '❌ Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:',
      error.message
    );
    process.exit(1);
  }
} else {
  // Local Development: Use local file
  try {
    serviceAccount = require(path.join(
      __dirname,
      './firebase-stage-credentials.json'
    ));
    console.log('✅ Using Firebase service account from local file');
  } catch (error) {
    console.error(
      '❌ Firebase service account not found. Please set FIREBASE_SERVICE_ACCOUNT environment variable or add firebaseServiceAccount.json'
    );
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET ||
    'visaconnectus-stage.firebasestorage.app',
});

const app: Express = express();
const PORT = process.env.PORT || 8080;

// Test database connection
pool
  .query('SELECT NOW()')
  .then(() => {
    console.log('✅ PostgreSQL database connected successfully');
  })
  .catch((err) => {
    console.error('❌ PostgreSQL database connection failed:', err.message);
  });

// Middleware setup
app.use(express.json()); // For parsing JSON bodies

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.APP_URL,
].filter((value): value is string => Boolean(value));

const corsOptionsDelegate: CorsOptionsDelegate = (req, callback) => {
  const origin = req.headers['origin'];
  const method = (req.method || '').toUpperCase();
  const isReadOnlyRequest = method === 'GET' || method === 'HEAD';

  if (!origin) {
    if (process.env.NODE_ENV !== 'production' || isReadOnlyRequest) {
      callback(null, { origin: true, credentials: true } as CorsOptions);
      return;
    }

    callback(
      new Error(
        'Requests without an Origin header are not allowed in production'
      )
    );
    return;
  }

  if (origin && defaultAllowedOrigins.includes(origin)) {
    callback(null, { origin: true, credentials: true } as CorsOptions);
  } else {
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  }
};

app.use(cors(corsOptionsDelegate));
app.options('*', cors(corsOptionsDelegate));

// Content Security Policy - Allow necessary resources
// Note: 'unsafe-inline' is currently required for React apps built with Create React App
// as React uses inline scripts during hydration and Webpack may generate inline scripts.
// This weakens protection against XSS attacks. Future improvement: migrate to a custom build setup
// (e.g., Vite or custom Webpack config) to implement nonces or hashes for inline scripts and styles,
// allowing us to remove 'unsafe-inline' and significantly improve security posture.
// TODO: Implement nonce-based or hash-based CSP [CSP Security Enhancement]
// Options:
//   1. Migrate to Vite (recommended): Vite supports CSP nonces out of the box via @vitejs/plugin-react
//   2. Use react-app-rewired: Customize CRA build to inject nonces into inline scripts/styles
//   3. Use @craco/craco: Alternative to react-app-rewired for customizing CRA
//   4. Manual hash-based CSP: Extract inline script/style hashes and add them to CSP policy
// See: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP for CSP best practices
app.use((req: Request, res: Response, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Construct WebSocket URL from APP_URL environment variable
    let wsUrl = '';
    if (process.env.APP_URL) {
      try {
        const appUrl = new URL(process.env.APP_URL);
        // Convert http/https to ws/wss
        const wsProtocol = appUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${wsProtocol}//${appUrl.host}`;
      } catch (error) {
        console.warn(
          '⚠️  Invalid APP_URL format, WebSocket CSP directive will be omitted:',
          error
        );
      }
    }

    // Build CSP policy with dynamic WebSocket URL
    const cspPolicy =
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "font-src 'self' data:; " +
      "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://lh3.googleusercontent.com; " +
      "connect-src 'self' https://*.googleapis.com https://identitytoolkit.googleapis.com https://nominatim.openstreetmap.org" +
      (wsUrl ? ` ${wsUrl}` : '') +
      '; ' +
      "manifest-src 'self'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none'; " +
      "object-src 'none';";

    res.setHeader('Content-Security-Policy', cspPolicy);
  }
  next();
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    const dbResult = await pool.query(
      'SELECT NOW() as timestamp, version() as version'
    );

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        firebase: 'initialized',
        server: 'running',
      },
      database: {
        timestamp: dbResult.rows[0].timestamp,
        version: dbResult.rows[0].version.split(' ')[1], // Extract version number
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: 'disconnected',
        firebase: 'initialized',
        server: 'running',
      },
    });
  }
});

// Register API routes
registerApiRoutes(app);

// Serve static files and handle root route
const buildPath = path.join(__dirname, '../../build');

if (process.env.NODE_ENV !== 'development') {
  // Production: Serve static files from build directory
  console.log('Serving static files from:', buildPath);

  // Check if build directory exists
  if (!fs.existsSync(buildPath)) {
    console.warn('⚠️  Build directory not found at:', buildPath);
    console.warn(
      '⚠️  Static file serving disabled. API endpoints will still work.'
    );

    // Still provide a catch-all for root route
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
        return;
      }
      res.status(404).json({
        error: 'Frontend not built. Please run: npm run build',
      });
    });
  } else {
    // Add cache-busting headers for static assets
    app.use(
      express.static(buildPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
            // Cache static assets for 1 year with cache busting
            res.setHeader(
              'Cache-Control',
              'public, max-age=31536000, immutable'
            );
          } else if (filePath.endsWith('.html')) {
            // Don't cache HTML files
            res.setHeader(
              'Cache-Control',
              'no-cache, no-store, must-revalidate'
            );
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        },
      })
    );

    // Serve React app for all other routes LAST (after static files)
    // This catch-all route handles client-side routing
    app.get('*', (req: Request, res: Response) => {
      // Skip API routes (should never reach here, but safety check)
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
        return;
      }

      const indexPath = path.resolve(buildPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        // Only log for root route to reduce log noise
        if (req.path === '/' || req.path === '') {
          console.log('Serving index.html from:', indexPath);
        }
        // Add no-cache headers for HTML files
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error('Error sending index.html:', err);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Failed to serve frontend' });
            }
          }
        });
      } else {
        console.warn('⚠️  index.html not found at:', indexPath);
        res.status(404).json({
          error: 'Frontend not built. Please run: npm run build',
        });
      }
    });
  }
} else {
  // Development mode: Frontend is served by React dev server on port 3000
  // API requests are proxied from frontend to this server on port 8080
  // No root route handler - users should access frontend on port 3000
}

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize WebSocket service for real-time chat
new WebSocketService(server);
console.log('✅ WebSocket service initialized for real-time chat');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end();
    process.exit(0);
  });
});

import path from 'path';
import fs from 'fs';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
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
app.use(cors()); // Enable CORS for all routes

// Content Security Policy - Allow necessary resources
app.use((req: Request, res: Response, next) => {
  // Only set CSP in production to avoid conflicts with React dev server
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline' data:; " +
        "font-src 'self' data:; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https://identitytoolkit.googleapis.com https://www.googleapis.com wss: ws:; " +
        "manifest-src 'self'; " +
        "frame-ancestors 'none';"
    );
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

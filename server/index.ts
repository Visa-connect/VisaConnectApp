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

// Only serve static files in production
if (process.env.NODE_ENV !== 'development') {
  // Serve static files from the React app build FIRST
  const buildPath = path.join(__dirname, '../../build');

  console.log('Serving static files from:', buildPath);

  // Check if build directory exists
  if (!fs.existsSync(buildPath)) {
    console.warn('⚠️  Build directory not found at:', buildPath);
    console.warn(
      '⚠️  Static file serving disabled. API endpoints will still work.'
    );
  } else {
    // Add cache-busting headers for static assets
    app.use(
      express.static(buildPath, {
        setHeaders: (res, path) => {
          if (path.endsWith('.js') || path.endsWith('.css')) {
            // Cache static assets for 1 year with cache busting
            res.setHeader(
              'Cache-Control',
              'public, max-age=31536000, immutable'
            );
          } else if (path.endsWith('.html')) {
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
    app.get('*', (req: Request, res: Response) => {
      const indexPath = path.join(buildPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        console.log('Serving index.html from:', indexPath);
        // Add no-cache headers for HTML files
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(indexPath);
      } else {
        console.warn('⚠️  index.html not found at:', indexPath);
        res
          .status(404)
          .json({ error: 'Frontend not built. Please run: npm run build' });
      }
    });
  }
} else {
  console.log('Development mode: Static file serving disabled');
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

import { Pool, PoolConfig } from 'pg';
import { config } from '../config/env';

// Database configuration
let dbConfig: PoolConfig;

if (config.database.url) {
  // Production: Use Heroku DATABASE_URL
  console.log('Using DATABASE_URL for database connection');
  dbConfig = {
    connectionString: config.database.url,
    ssl: {
      rejectUnauthorized: false, // Required for Heroku
    },
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 10 seconds if connection could not be established
  };
} else {
  // Development: Use local environment variables
  console.log('Using individual database environment variables');
  dbConfig = {
    user: config.database.user,
    host: config.database.host,
    database: config.database.database,
    password: config.database.password,
    port: config.database.port,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  };
}

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection with retry logic
const testConnection = async (retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('Connected to PostgreSQL database');
      client.release();
      return;
    } catch (err) {
      const error = err as Error;
      console.error(
        `Connection attempt ${i + 1}/${retries} failed:`,
        error.message
      );
      if (i === retries - 1) {
        console.error(
          'Failed to connect to PostgreSQL database after all retries'
        );
        process.exit(-1);
      }
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

testConnection();

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

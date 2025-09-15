#!/usr/bin/env node

/**
 * Simple Migration Runner
 *
 * This script runs database migrations in order and tracks them in a migrations table.
 * It's designed to be lightweight, simple, and Heroku-friendly.
 *
 * Usage:
 *   node scripts/migrate.js                    # Run all pending migrations
 *   node scripts/migrate.js --dry-run          # Show what would be run
 *   node scripts/migrate.js --status           # Show migration status
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Database connection
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5431,
      }
);

// Migration tracking table
const MIGRATIONS_TABLE = 'migrations';

async function createMigrationsTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(64)
      )
    `);
  } finally {
    client.release();
  }
}

async function getAppliedMigrations() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY id`
    );
    return result.rows.map((row) => row.filename);
  } finally {
    client.release();
  }
}

async function recordMigration(filename, checksum) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (filename, checksum) VALUES ($1, $2)`,
      [filename, checksum]
    );
  } finally {
    client.release();
  }
}

function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('📁 No migrations directory found. Creating...');
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

function calculateChecksum(content) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(content).digest('hex');
}

async function runMigration(filename) {
  const client = await pool.connect();
  try {
    const filePath = path.join(__dirname, '..', 'db', 'migrations', filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const checksum = calculateChecksum(content);

    console.log(`🔄 Running migration: ${filename}`);

    // Run the migration
    await client.query(content);

    // Record it
    await recordMigration(filename, checksum);

    console.log(`✅ Migration applied: ${filename}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`);
    console.error(error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations(dryRun = false) {
  try {
    console.log('🚀 Starting migration process...');

    // Test database connection first
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('💡 Database does not exist. Attempting to create it...');
        try {
          // Try to create the database
          await client.query('CREATE DATABASE visaconnect');
          console.log('✅ Database "visaconnect" created successfully');
        } catch (createError) {
          console.error('❌ Failed to create database:', createError.message);
          console.log('💡 Please create the database manually:');
          console.log('   createdb visaconnect');
          console.log('   or');
          console.log('   psql -U postgres -c "CREATE DATABASE visaconnect;"');
          throw createError;
        }
      } else {
        throw error;
      }
    } finally {
      client.release();
    }

    // Create migrations table if it doesn't exist
    await createMigrationsTable();

    // Get applied and available migrations
    const appliedMigrations = await getAppliedMigrations();
    const availableMigrations = getMigrationFiles();

    // Find pending migrations
    const pendingMigrations = availableMigrations.filter(
      (migration) => !appliedMigrations.includes(migration)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migrations:`);
    pendingMigrations.forEach((migration) => console.log(`  - ${migration}`));

    if (dryRun) {
      console.log('🔍 Dry run complete - no changes made');
      return;
    }

    // Run pending migrations
    for (const migration of pendingMigrations) {
      await runMigration(migration);
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('💥 Migration process failed:', error.message);
    process.exit(1);
  }
}

async function showStatus() {
  try {
    await createMigrationsTable();

    const appliedMigrations = await getAppliedMigrations();
    const availableMigrations = getMigrationFiles();

    console.log('📊 Migration Status:');
    console.log(`Applied: ${appliedMigrations.length}`);
    console.log(`Available: ${availableMigrations.length}`);
    console.log(
      `Pending: ${availableMigrations.length - appliedMigrations.length}`
    );

    if (appliedMigrations.length > 0) {
      console.log('\n✅ Applied migrations:');
      appliedMigrations.forEach((migration) => console.log(`  - ${migration}`));
    }

    const pending = availableMigrations.filter(
      (m) => !appliedMigrations.includes(m)
    );
    if (pending.length > 0) {
      console.log('\n⏳ Pending migrations:');
      pending.forEach((migration) => console.log(`  - ${migration}`));
    }
  } catch (error) {
    console.error('❌ Failed to get migration status:', error.message);
    process.exit(1);
  }
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Migration Runner

Usage:
  node scripts/migrate.js                    # Run all pending migrations
  node scripts/migrate.js --dry-run          # Show what would be run
  node scripts/migrate.js --status           # Show migration status
  node scripts/migrate.js --help             # Show this help

Environment Variables:
  DATABASE_URL     # Full database URL (for Heroku)
  DB_USER          # Database user (for local)
  DB_HOST          # Database host (for local)
  DB_NAME          # Database name (for local)
  DB_PASSWORD      # Database password (for local)
  DB_PORT          # Database port (for local, default: 5432)
`);
  process.exit(0);
}

if (args.includes('--status')) {
  showStatus();
} else if (args.includes('--dry-run')) {
  runMigrations(true);
} else {
  runMigrations();
}

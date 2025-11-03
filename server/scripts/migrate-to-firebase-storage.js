#!/usr/bin/env node

/**
 * Migration script to migrate from Cloudinary to Firebase Storage
 * This script applies the database migration and provides status updates
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting Firebase Storage migration...');

    // Check if migration has already been applied (only if migration_log table exists)
    let migrationAlreadyApplied = false;
    try {
      const checkMigration = await client.query(`
        SELECT 1 FROM migration_log 
        WHERE migration_name = '005_migrate_to_firebase_storage'
      `);
      migrationAlreadyApplied = checkMigration.rows.length > 0;
    } catch (error) {
      // migration_log table doesn't exist yet, which is fine
      console.log('📝 Migration log table will be created during migration...');
    }

    if (migrationAlreadyApplied) {
      console.log('✅ Migration already applied. Skipping...');
      return;
    }

    // Read and execute the migration file
    const migrationPath = path.join(
      __dirname,
      '../db/migrations/005_migrate_to_firebase_storage.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Applying database migration...');
    await client.query(migrationSQL);

    console.log('✅ Database migration completed successfully!');

    // Show current storage usage
    console.log('\n📊 Current Firebase Storage usage:');
    const usageQuery = await client.query(
      'SELECT * FROM firebase_storage_usage'
    );

    if (usageQuery.rows.length > 0) {
      console.table(usageQuery.rows);
    } else {
      console.log('No files currently stored.');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log(
      '1. Update your environment variables with Firebase Storage bucket name'
    );
    console.log('2. Test file uploads in your application');
    console.log(
      '3. Monitor storage usage with the firebase_storage_usage view'
    );
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'visaconnect',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5431,
});

async function runMigration() {
  try {
    console.log('Connecting to database...');

    // Test connection
    const client = await pool.connect();
    console.log('Database connection successful!');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'db/add-meetup-photo-url.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: add-meetup-photo-url.sql');
    console.log('Migration content:');
    console.log(migrationSQL);

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log(
      '✅ Added photo_url and photo_public_id fields to meetups table'
    );

    // Verify the changes
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'meetups' 
      AND column_name IN ('photo_url', 'photo_public_id')
      ORDER BY column_name
    `);

    console.log('\nVerification - New columns:');
    result.rows.forEach((row) => {
      console.log(
        `  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`
      );
    });

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure PostgreSQL is running:');
      console.error('   brew services start postgresql (macOS)');
      console.error('   sudo systemctl start postgresql (Linux)');
      console.error('   or start your PostgreSQL service');
    }

    if (error.code === '28P01') {
      console.error('\n💡 Check your database credentials in .env file');
    }

    if (error.code === '3D000') {
      console.error('\n💡 Database does not exist. Create it first:');
      console.error('   createdb visaconnect');
    }

    process.exit(1);
  }
}

runMigration();

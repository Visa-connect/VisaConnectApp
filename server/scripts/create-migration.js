#!/usr/bin/env node

/**
 * Migration File Generator
 *
 * Creates a new migration file with the current timestamp
 *
 * Usage:
 *   node scripts/create-migration.js "description_of_migration"
 *
 * Example:
 *   node scripts/create-migration.js "add_new_feature"
 *   Creates: 20241203143025_add_new_feature.sql
 */

const fs = require('fs');
const path = require('path');

// Get migration description from command line
const description = process.argv[2];

if (!description) {
  console.error('❌ Error: Migration description is required');
  console.log('\nUsage:');
  console.log('  node scripts/create-migration.js "description_of_migration"');
  console.log('\nExample:');
  console.log('  node scripts/create-migration.js "add_user_email_column"');
  process.exit(1);
}

// Generate timestamp in YYYYMMDDHHMMSS format
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
const seconds = String(now.getSeconds()).padStart(2, '0');

const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

// Sanitize description (replace spaces with underscores, lowercase)
const sanitizedDescription = description
  .toLowerCase()
  .replace(/\s+/g, '_')
  .replace(/[^a-z0-9_]/g, '');

// Create filename
const filename = `${timestamp}_${sanitizedDescription}.sql`;

// Get migrations directory path
const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
const filePath = path.join(migrationsDir, filename);

// Create migrations directory if it doesn't exist
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
  console.log(`📁 Created migrations directory: ${migrationsDir}`);
}

// Check if file already exists
if (fs.existsSync(filePath)) {
  console.error(`❌ Error: Migration file already exists: ${filename}`);
  process.exit(1);
}

// Create migration file with template
const template = `-- ${filename}
-- ${description}

-- TODO: Add your migration SQL here
-- Remember to:
-- - Use IF NOT EXISTS for idempotency
-- - Include rollback information in comments
-- - Test locally with: npm run migrate:dry-run

BEGIN;

-- Add your migration SQL here

COMMIT;
`;

fs.writeFileSync(filePath, template, 'utf8');

console.log(`✅ Created migration file: ${filename}`);
console.log(`📝 Location: ${filePath}`);
console.log(`\n💡 Next steps:`);
console.log(`   1. Edit the migration file and add your SQL`);
console.log(`   2. Test locally: npm run migrate:dry-run`);
console.log(`   3. Run migration: npm run migrate`);
console.log(`   4. Commit and deploy`);

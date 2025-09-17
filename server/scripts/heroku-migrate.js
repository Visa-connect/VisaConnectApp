#!/usr/bin/env node

/**
 * Heroku Migration Runner
 *
 * This script is specifically designed for Heroku deployment.
 * It runs migrations as part of the release process.
 *
 * Usage in Heroku:
 *   heroku run node scripts/heroku-migrate.js
 *
 * Or add to package.json scripts for release phase:
 *   "heroku-postbuild": "npm run build && node scripts/heroku-migrate.js"
 */

const { execSync } = require('child_process');

console.log('🚀 Starting Heroku migration process...');

try {
  // Run the migration script
  execSync('node scripts/migrate.js', {
    stdio: 'inherit',
    cwd: __dirname + '/..',
  });

  console.log('✅ Heroku migrations completed successfully!');
} catch (error) {
  console.error('❌ Heroku migration failed:', error.message);
  process.exit(1);
}

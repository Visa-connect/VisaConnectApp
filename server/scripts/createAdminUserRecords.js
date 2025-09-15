const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase-stage-credentials.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

// Import userService (we'll need to create a simple version for this script)
const { Pool } = require('pg');
const config = require('../config/env');

const pool = new Pool({
  connectionString: config.database.url,
});

/**
 * Create user record for admin users
 * @param {string} uid - Firebase UID
 * @param {string} email - User's email
 */
async function createAdminUserRecord(uid, email) {
  try {
    console.log(`Creating user record for admin: ${email} (${uid})`);

    // Check if user record already exists
    const checkQuery = 'SELECT id FROM users WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [uid]);

    if (checkResult.rows.length > 0) {
      console.log(`✅ User record already exists for ${email}`);
      return;
    }

    // Create user record
    const insertQuery = `
      INSERT INTO users (
        id, email, first_name, last_name, visa_type, current_location, occupation, employer, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      )
      RETURNING *
    `;

    const values = [
      uid,
      email,
      'Admin',
      'User',
      'admin',
      JSON.stringify({
        city: 'Admin',
        state: 'Admin',
        country: 'Admin',
      }), // current_location
      'Administrator',
      'VisaConnect',
    ];

    const result = await pool.query(insertQuery, values);
    console.log(`✅ Created user record for admin: ${email}`);
    console.log('User record:', result.rows[0]);
  } catch (error) {
    console.error(`❌ Error creating user record for ${email}:`, error.message);
    throw error;
  }
}

/**
 * Create user records for all admin users
 */
async function createAllAdminUserRecords() {
  try {
    console.log('Creating user records for all admin users...');

    // Get all users
    const listUsersResult = await auth.listUsers();
    const adminUsers = [];

    for (const userRecord of listUsersResult.users) {
      const customClaims = userRecord.customClaims;
      if (customClaims?.admin && customClaims?.role === 'admin') {
        adminUsers.push({
          uid: userRecord.uid,
          email: userRecord.email,
        });
      }
    }

    console.log(`Found ${adminUsers.length} admin users:`);
    adminUsers.forEach((user) => {
      console.log(`- ${user.email} (${user.uid})`);
    });

    // Create user records for each admin
    for (const user of adminUsers) {
      await createAdminUserRecord(user.uid, user.email);
    }

    console.log('✅ All admin user records created successfully!');
  } catch (error) {
    console.error('❌ Error creating admin user records:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'all':
        await createAllAdminUserRecords();
        break;

      case 'single':
        const email = args[1];
        if (!email) {
          console.error('❌ Please provide an email address');
          console.log('Usage: node createAdminUserRecords.js single <email>');
          process.exit(1);
        }

        // Get user by email
        const userRecord = await auth.getUserByEmail(email);
        await createAdminUserRecord(userRecord.uid, userRecord.email);
        break;

      default:
        console.log('Admin User Records Creation Tool');
        console.log('');
        console.log('Usage:');
        console.log(
          '  node createAdminUserRecords.js all                    - Create records for all admin users'
        );
        console.log(
          '  node createAdminUserRecords.js single <email>         - Create record for specific admin user'
        );
        console.log('');
        console.log('Examples:');
        console.log('  node createAdminUserRecords.js all');
        console.log(
          '  node createAdminUserRecords.js single admin@visaconnect.com'
        );
        break;
    }
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
main();

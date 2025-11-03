const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5431,
    database: process.env.DB_NAME || 'visaconnect',
    user: process.env.DB_USER || 'arronlinton',
    password: process.env.DB_PASSWORD || '',
  },
  ssl:
    process.env.DATABASE_URL &&
    process.env.DATABASE_URL.includes('amazonaws.com')
      ? { rejectUnauthorized: false }
      : false,
});

const adminEmails = [
  'arron@thecreativebomb.com',
  'raphael.sagna@hotmail.fr',
  'markesedev+1@gmail.com',
];

// Validate environment variables
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  console.error('❌ Database configuration missing!');
  console.error(
    'Please set either DATABASE_URL or DB_HOST, DB_NAME, DB_USER, DB_PASSWORD'
  );
  process.exit(1);
}

async function updateAdminUsers() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking current admin status for users...');

    // First, check current status
    for (const email of adminEmails) {
      const checkResult = await client.query(
        'SELECT email, admin FROM users WHERE email = $1',
        [email]
      );

      if (checkResult.rows.length === 0) {
        console.log(`❌ User not found: ${email}`);
      } else {
        const user = checkResult.rows[0];
        console.log(`📧 ${email}: admin = ${user.admin}`);
      }
    }

    console.log('\n🔄 Updating admin status...');

    // Update admin status for each email
    for (const email of adminEmails) {
      const result = await client.query(
        'UPDATE users SET admin = true WHERE email = $1',
        [email]
      );

      if (result.rowCount > 0) {
        console.log(`✅ Updated admin status for: ${email}`);
      } else {
        console.log(`❌ No user found with email: ${email}`);
      }
    }

    console.log('\n🔍 Verifying updates...');

    // Verify the updates
    for (const email of adminEmails) {
      const verifyResult = await client.query(
        'SELECT email, admin FROM users WHERE email = $1',
        [email]
      );

      if (verifyResult.rows.length > 0) {
        const user = verifyResult.rows[0];
        console.log(
          `📧 ${email}: admin = ${user.admin} ${user.admin ? '✅' : '❌'}`
        );
      }
    }

    console.log('\n🎉 Admin user updates completed!');
  } catch (error) {
    console.error('💥 Error updating admin users:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateAdminUsers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

const { Pool } = require('pg');

// Database configuration - Staging Database
const pool = new Pool({
  connectionString:
    'postgres://ud3490vsimps0l:pc52265fbf2064bb15a8c846189bd727a831c6e9c030c8d6a7b8653af37f85c98@c3v5n5ajfopshl.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d4k000avb1spk6',
  ssl: {
    rejectUnauthorized: false,
  },
});

const adminEmails = [
  'arron@thecreativebomb.com',
  'raphael.sagna@hotmail.fr',
  'markesedev+1@gmail.com',
];

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

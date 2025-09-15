const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./server/firebase-stage-credentials.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

async function listUsers() {
  try {
    console.log('Listing all users in Firebase...\n');

    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users;

    if (users.length === 0) {
      console.log('❌ No users found in Firebase');
      return;
    }

    console.log(`Found ${users.length} user(s):\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Display Name: ${user.displayName || 'Not set'}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(
        `   Custom Claims: ${JSON.stringify(user.customClaims || {})}`
      );
      console.log('   ---');
    });

    // Check if admin@live.com exists (case insensitive)
    const adminUser = users.find(
      (user) => user.email && user.email.toLowerCase() === 'admin@live.com'
    );

    if (adminUser) {
      console.log('\n✅ Found admin@live.com user!');
      console.log('You can now run: node set-admin-claims.js admin@live.com');
    } else {
      console.log('\n❌ admin@live.com not found');
      console.log(
        'Please create the user in Firebase Console first, or check the exact email address.'
      );
    }
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  } finally {
    process.exit(0);
  }
}

listUsers();

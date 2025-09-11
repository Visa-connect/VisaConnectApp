const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./server/firebase-stage-credentials.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

async function setAdminClaims(email) {
  try {
    console.log(`Setting admin claims for ${email}...`);

    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid} (${userRecord.email})`);

    // Set admin claims
    await auth.setCustomUserClaims(userRecord.uid, {
      admin: true,
      role: 'admin',
    });

    console.log('✅ Successfully set admin claims!');

    // Verify the claims were set
    const updatedUser = await auth.getUser(userRecord.uid);
    console.log('Verified custom claims:', updatedUser.customClaims);

    console.log('\n🎉 Admin user setup complete!');
    console.log('You can now login to the admin portal with this email.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.log('Usage: node set-admin-claims.js <email>');
  console.log('Example: node set-admin-claims.js admin@live.com');
  process.exit(1);
}

setAdminClaims(email);

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../server/firebase-stage-credentials.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

async function makeAdmin(email) {
  try {
    console.log(`Making ${email} an admin...`);

    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid} (${userRecord.email})`);

    // Set admin claims
    await auth.setCustomUserClaims(userRecord.uid, {
      admin: true,
      role: 'admin',
    });

    console.log('✅ Successfully made user an admin!');

    // Verify the claims were set
    const updatedUser = await auth.getUser(userRecord.uid);
    console.log('Admin claims:', updatedUser.customClaims);

    console.log(`\n🎉 ${email} is now an admin!`);
    console.log('You can now login to the admin portal with this email.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

// Get email from command line
const email = process.argv[2];
if (!email) {
  console.log('Usage: node make-admin.js <email>');
  console.log('Example: node make-admin.js lin@live.com');
  process.exit(1);
}

makeAdmin(email);

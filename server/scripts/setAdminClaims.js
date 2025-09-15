const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase-stage-credentials.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

/**
 * Set admin claims for a user by email
 * @param {string} email - User's email address
 * @param {boolean} isAdmin - Whether to grant admin privileges
 */
async function setAdminClaims(email, isAdmin = true) {
  try {
    console.log(`Setting admin claims for ${email}...`);

    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid} (${userRecord.email})`);

    // Set custom claims
    const customClaims = {
      admin: isAdmin,
      role: isAdmin ? 'admin' : 'user',
    };

    await auth.setCustomUserClaims(userRecord.uid, customClaims);

    console.log(`✅ Successfully set admin claims for ${email}:`, customClaims);

    // Verify the claims were set
    const updatedUser = await auth.getUser(userRecord.uid);
    console.log('Verified custom claims:', updatedUser.customClaims);
  } catch (error) {
    console.error(`❌ Error setting admin claims for ${email}:`, error.message);
    throw error;
  }
}

/**
 * Remove admin claims for a user by email
 * @param {string} email - User's email address
 */
async function removeAdminClaims(email) {
  try {
    console.log(`Removing admin claims for ${email}...`);

    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid} (${userRecord.email})`);

    // Remove admin claims
    const customClaims = {
      admin: false,
      role: 'user',
    };

    await auth.setCustomUserClaims(userRecord.uid, customClaims);

    console.log(`✅ Successfully removed admin claims for ${email}`);

    // Verify the claims were removed
    const updatedUser = await auth.getUser(userRecord.uid);
    console.log('Verified custom claims:', updatedUser.customClaims);
  } catch (error) {
    console.error(
      `❌ Error removing admin claims for ${email}:`,
      error.message
    );
    throw error;
  }
}

/**
 * List all users with admin claims
 */
async function listAdminUsers() {
  try {
    console.log('Listing all admin users...');

    // Get all users (this is a simplified approach - in production you might want to paginate)
    const listUsersResult = await auth.listUsers();
    const adminUsers = [];

    for (const userRecord of listUsersResult.users) {
      const customClaims = userRecord.customClaims;
      if (customClaims?.admin && customClaims?.role === 'admin') {
        adminUsers.push({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          customClaims: customClaims,
        });
      }
    }

    console.log(`Found ${adminUsers.length} admin users:`);
    adminUsers.forEach((user) => {
      console.log(`- ${user.email} (${user.uid})`);
    });

    return adminUsers;
  } catch (error) {
    console.error('❌ Error listing admin users:', error.message);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'set':
        const email = args[1];
        if (!email) {
          console.error('❌ Please provide an email address');
          console.log('Usage: node setAdminClaims.js set <email>');
          process.exit(1);
        }
        await setAdminClaims(email, true);
        break;

      case 'remove':
        const removeEmail = args[1];
        if (!removeEmail) {
          console.error('❌ Please provide an email address');
          console.log('Usage: node setAdminClaims.js remove <email>');
          process.exit(1);
        }
        await removeAdminClaims(removeEmail);
        break;

      case 'list':
        await listAdminUsers();
        break;

      default:
        console.log('Admin Claims Management Tool');
        console.log('');
        console.log('Usage:');
        console.log(
          '  node setAdminClaims.js set <email>     - Grant admin privileges'
        );
        console.log(
          '  node setAdminClaims.js remove <email>  - Remove admin privileges'
        );
        console.log(
          '  node setAdminClaims.js list            - List all admin users'
        );
        console.log('');
        console.log('Examples:');
        console.log('  node setAdminClaims.js set admin@visaconnect.com');
        console.log('  node setAdminClaims.js remove user@example.com');
        console.log('  node setAdminClaims.js list');
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

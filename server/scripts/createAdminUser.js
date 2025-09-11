const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase-stage-credentials.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

/**
 * Create an admin user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {string} displayName - User's display name
 */
async function createAdminUser(email, password, displayName = 'Admin User') {
  try {
    console.log(`Creating admin user: ${email}...`);

    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(email);
      console.log(
        `User already exists: ${existingUser.uid} (${existingUser.email})`
      );

      // Update the user to ensure they have a password
      await auth.updateUser(existingUser.uid, {
        password: password,
        displayName: displayName,
      });

      console.log('✅ Updated existing user with password and display name');

      // Set admin claims
      await auth.setCustomUserClaims(existingUser.uid, {
        admin: true,
        role: 'admin',
      });

      console.log('✅ Set admin claims for existing user');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // User doesn't exist, create new one
        const userRecord = await auth.createUser({
          email: email,
          password: password,
          displayName: displayName,
          emailVerified: true, // Set to true for admin users
        });

        console.log(
          `✅ Created new admin user: ${userRecord.uid} (${userRecord.email})`
        );

        // Set admin claims
        await auth.setCustomUserClaims(userRecord.uid, {
          admin: true,
          role: 'admin',
        });

        console.log('✅ Set admin claims for new user');
      } else {
        throw error;
      }
    }

    // Verify the user and claims
    const userRecord = await auth.getUserByEmail(email);
    console.log('✅ Final user record:', {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      emailVerified: userRecord.emailVerified,
      customClaims: userRecord.customClaims,
    });
  } catch (error) {
    console.error(`❌ Error creating admin user:`, error.message);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];
  const displayName = args[2] || 'Admin User';

  if (!email || !password) {
    console.log('Admin User Creation Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node createAdminUser.js <email> <password> [displayName]');
    console.log('');
    console.log('Examples:');
    console.log(
      '  node createAdminUser.js admin@visaconnect.com admin123 "Admin User"'
    );
    console.log('  node createAdminUser.js admin@live.com mypassword123');
    console.log('');
    process.exit(1);
  }

  try {
    await createAdminUser(email, password, displayName);
    console.log('\n🎉 Admin user setup complete!');
    console.log(
      'You can now use these credentials to login to the admin portal.'
    );
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
main();

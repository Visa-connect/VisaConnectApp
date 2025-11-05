# Admin User Management

This document covers how to manage admin users in Firebase Auth and the database using the available admin scripts.

## Prerequisites

All admin scripts require Firebase credentials configured via one of these methods:

- **Environment Variable** (Recommended for production/staging): Set `FIREBASE_SERVICE_ACCOUNT` with the full JSON service account object
- **Local File** (Development): Place `firebase-stage-credentials.json` in the server directory

The scripts automatically detect and use the appropriate credential source.

---

## Admin Scripts

### 1. make-admin.js - Grant Admin Privileges to Existing User

**Purpose**: Grants admin privileges to an existing user who already has a Firebase Auth account.

**What it does**:

- Finds the user by email address
- Sets Firebase custom claims (`admin: true`, `role: 'admin'`)
- Verifies the claims were set correctly

**Use case**: When you need to make an existing user an admin without changing their password or creating a new account.

#### Local Development

```bash
cd server
node scripts/make-admin.js user@example.com
```

#### Production/Staging (via Heroku CLI)

```bash
heroku run "cd server && node scripts/make-admin.js user@example.com" --app your-app-name
```

#### Example Output

```
✅ Using Firebase service account from environment variable
Making user@example.com an admin...
Found user: abc123xyz (user@example.com)
✅ Successfully made user an admin!
Admin claims: { admin: true, role: 'admin' }

🎉 user@example.com is now an admin!
You can now login to the admin portal with this email.
```

---

### 2. createAdminUser.js - Create New Admin User

**Purpose**: Creates a new admin user in Firebase Auth or updates an existing user with admin privileges.

**What it does**:

- Creates a new Firebase Auth user (if user doesn't exist)
- Updates existing user's password and display name (if user exists)
- Sets `emailVerified: true` for admin users
- Sets Firebase custom claims (`admin: true`, `role: 'admin'`)

**Use case**: When you need to create a brand new admin user or reset an existing admin's password.

#### Local Development

```bash
cd server
node scripts/createAdminUser.js admin@example.com password123 "Admin User"
```

**Arguments**:

- `email` (required): User's email address
- `password` (required): User's password
- `displayName` (optional): User's display name (defaults to "Admin User")

#### Production/Staging (via Heroku CLI)

```bash
heroku run "cd server && node scripts/createAdminUser.js admin@example.com password123 'Admin User'" --app your-app-name
```

#### Example Output

```
✅ Using Firebase service account from environment variable
Creating admin user: admin@example.com...
✅ Created new admin user: xyz789abc (admin@example.com)
✅ Set admin claims for new user
✅ Final user record: {
  uid: 'xyz789abc',
  email: 'admin@example.com',
  displayName: 'Admin User',
  emailVerified: true,
  customClaims: { admin: true, role: 'admin' }
}

🎉 Admin user setup complete!
You can now use these credentials to login to the admin portal.
```

---

### 3. setAdminClaims.js - Manage Admin Claims

**Purpose**: Comprehensive tool for managing admin claims with support for setting, removing, and listing admin users.

**What it does**:

- **Set**: Grant admin privileges to a user
- **Remove**: Revoke admin privileges from a user
- **List**: Display all users with admin privileges

**Use case**: When you need more control over admin claims management.

#### Local Development

**Grant admin privileges**:

```bash
cd server
node scripts/setAdminClaims.js set user@example.com
```

**Remove admin privileges**:

```bash
cd server
node scripts/setAdminClaims.js remove user@example.com
```

**List all admin users**:

```bash
cd server
node scripts/setAdminClaims.js list
```

#### Production/Staging (via Heroku CLI)

**Grant admin privileges**:

```bash
heroku run "cd server && node scripts/setAdminClaims.js set user@example.com" --app your-app-name
```

**Remove admin privileges**:

```bash
heroku run "cd server && node scripts/setAdminClaims.js remove user@example.com" --app your-app-name
```

**List all admin users**:

```bash
heroku run "cd server && node scripts/setAdminClaims.js list" --app your-app-name
```

#### Example Output (List)

```
✅ Using Firebase service account from environment variable
Listing all admin users...
Found 3 admin users:
- admin1@example.com (uid1)
- admin2@example.com (uid2)
- admin3@example.com (uid3)
```

---

### 4. updateAdminUsers.js - Update Database Admin Column

**Purpose**: Updates the `admin` column in the PostgreSQL `users` table for specified email addresses.

**What it does**:

- Checks current admin status for each email
- Updates `admin = true` in the database for specified emails
- Verifies the updates were applied

**Use case**: When you need to update the database `admin` column (separate from Firebase custom claims).

**Note**: This script requires direct database access. The `admin` column in the database is separate from Firebase custom claims. Admin authentication primarily uses Firebase custom claims, not the database column.

#### Local Development

Edit the script to add email addresses to the `adminEmails` array (lines 20-24), then:

```bash
cd server
node scripts/updateAdminUsers.js
```

#### Production/Staging (via Heroku CLI)

Edit the script file, then:

```bash
heroku run "cd server && node scripts/updateAdminUsers.js" --app your-app-name
```

#### Example Output

```
🔍 Checking current admin status for users...
📧 admin1@example.com: admin = false
📧 admin2@example.com: admin = true

🔄 Updating admin status...
✅ Updated admin status for: admin1@example.com
✅ Updated admin status for: admin2@example.com

🔍 Verifying updates...
📧 admin1@example.com: admin = true ✅
📧 admin2@example.com: admin = true ✅

🎉 Admin user updates completed!
```

---

## Script Comparison

| Script                | Creates Users | Updates Passwords | Sets Admin Claims | Works with Existing Users | Requires Password |
| --------------------- | ------------- | ----------------- | ----------------- | ------------------------- | ----------------- |
| `make-admin.js`       | ❌            | ❌                | ✅                | ✅                        | ❌                |
| `createAdminUser.js`  | ✅            | ✅                | ✅                | ✅                        | ✅                |
| `setAdminClaims.js`   | ❌            | ❌                | ✅                | ✅                        | ❌                |
| `updateAdminUsers.js` | ❌            | ❌                | ❌                | ✅                        | ❌                |

---

## Quick Reference

### Making an existing user an admin (recommended)

```bash
# Local
cd server
node scripts/make-admin.js user@example.com

# Production
heroku run "cd server && node scripts/make-admin.js user@example.com" --app your-app-name
```

### Creating a new admin user

```bash
# Local
cd server
node scripts/createAdminUser.js admin@example.com password123

# Production
heroku run "cd server && node scripts/createAdminUser.js admin@example.com password123" --app your-app-name
```

### Listing all admin users

```bash
# Local
cd server
node scripts/setAdminClaims.js list

# Production
heroku run "cd server && node scripts/setAdminClaims.js list" --app your-app-name
```

---

## Important Notes

### Firebase Custom Claims vs Database Column

- **Firebase Custom Claims**: Used by `adminAuthServiceSimple.ts` for authentication. This is the primary method for admin access.
- **Database `admin` Column**: Separate from Firebase claims. May be used for business logic or reporting.

**Important**: Admin authentication primarily uses Firebase custom claims, not the database column. Always use `make-admin.js`, `createAdminUser.js`, or `setAdminClaims.js` for granting admin access.

### Security Considerations

- **Never commit credentials**: Always use environment variables in production
- **Strong passwords**: Use strong passwords when creating new admin users
- **Audit trail**: Use `setAdminClaims.js list` to audit admin users regularly
- **Principle of least privilege**: Only grant admin access to users who need it

### Environment Variables

For production/staging, ensure `FIREBASE_SERVICE_ACCOUNT` is set in Heroku:

```bash
# Check if it's set
heroku config:get FIREBASE_SERVICE_ACCOUNT --app your-app-name

# Set it (if needed)
heroku config:set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}' --app your-app-name
```

---

## Troubleshooting

**Error: "Cannot find module '/app/server/scripts/make-admin.js'"**

- Ensure you're running the command from the correct directory
- Scripts must be in `server/scripts/` directory

**Error: "Failed to parse FIREBASE_SERVICE_ACCOUNT"**

- Verify the environment variable is set correctly
- Ensure the JSON is properly formatted and escaped

**Error: "User not found"**

- Verify the user exists in Firebase Auth before running `make-admin.js`
- Use `createAdminUser.js` if you need to create a new user

**Error: "Failed to load Firebase credentials file"**

- For local development, ensure `firebase-stage-credentials.json` exists in the `server/` directory
- Or set `FIREBASE_SERVICE_ACCOUNT` environment variable

---

## Related Documentation

- [Server Scripts README](../server/scripts/README.md) - General information about server scripts
- [Deployment Guide](./DEPLOYMENT.md) - Deployment and environment setup
- [CI/CD Guide](./CI_CD_README.md) - Continuous integration and deployment

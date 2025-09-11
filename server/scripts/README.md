# Admin User Management

This directory contains scripts for managing admin users in Firebase Authentication.

## Overview

Admin users are managed through Firebase custom claims, not hardcoded email lists. This provides better security and flexibility for managing admin access.

## Scripts

### `setAdminClaims.js`

A utility script for managing admin user privileges in Firebase.

#### Usage

```bash
# Grant admin privileges to a user
node setAdminClaims.js set <email>

# Remove admin privileges from a user
node setAdminClaims.js remove <email>

# List all admin users
node setAdminClaims.js list

# Show help
node setAdminClaims.js
```

#### Examples

```bash
# Make admin@visaconnect.com an admin
node setAdminClaims.js set admin@visaconnect.com

# Remove admin privileges from user@example.com
node setAdminClaims.js remove user@example.com

# List all current admin users
node setAdminClaims.js list
```

## How It Works

1. **Custom Claims**: Admin status is stored in Firebase custom claims
2. **Claims Structure**:
   ```json
   {
     "admin": true,
     "role": "admin"
   }
   ```
3. **Backend Verification**: The admin auth API checks these claims before allowing access
4. **No Hardcoded Emails**: All admin management is done through Firebase

## Security

- Admin privileges are managed through Firebase custom claims
- No hardcoded email lists in the codebase
- Claims are verified on every admin login attempt
- Easy to add/remove admin users without code changes

## Prerequisites

- Firebase project configured
- Service account credentials file (`firebase-stage-credentials.json`)
- Node.js environment with Firebase Admin SDK

## Error Handling

The script includes comprehensive error handling:

- User not found errors
- Permission errors
- Network errors
- Invalid email format errors

## Production Considerations

- Use environment-specific service account credentials
- Consider implementing audit logging for admin privilege changes
- Set up monitoring for admin access attempts
- Regular review of admin user list

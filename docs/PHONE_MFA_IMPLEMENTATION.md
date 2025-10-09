# Phone-Based Multi-Factor Authentication (MFA) Implementation

## Overview

This document describes the implementation of phone-based MFA for VisaConnect. The system allows users to optionally enable MFA using their phone number for enhanced account security.

## Architecture

### Hybrid Authentication System

The MFA implementation works **alongside** the existing email/password authentication:

```
┌─────────────────────────────────────────────────────────────┐
│                   User Authentication Flow                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Email/Password Login (Existing)                         │
│     ↓                                                         │
│  2. Check if MFA Enabled                                     │
│     ├─ No → Grant Access                                     │
│     └─ Yes → Request MFA Code                                │
│         ↓                                                     │
│         Send SMS Code                                         │
│         ↓                                                     │
│         Verify Code                                           │
│         ↓                                                     │
│         Grant Access                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Migration: `009_add_phone_mfa.sql`

Added the following columns to the `users` table:

```sql
-- Phone number in E.164 format (e.g., +14155552671)
phone_number VARCHAR(20) UNIQUE

-- Phone verification status
phone_verified BOOLEAN DEFAULT FALSE

-- MFA enrollment status
mfa_enabled BOOLEAN DEFAULT FALSE

-- Timestamp when phone was verified
phone_verified_at TIMESTAMP WITH TIME ZONE
```

**Indexes Created:**

- `idx_users_phone_number` - For fast phone number lookups
- `idx_users_phone_verified` - For filtering verified phones
- `idx_users_mfa_enabled` - For filtering MFA-enabled users

## Backend Implementation

### 1. Phone Validation Utilities (`server/utils/phoneValidation.ts`)

**Key Functions:**

```typescript
// Format phone number to E.164 format
formatToE164(phoneNumber: string, countryCode: CountryCode): string | null

// Validate E.164 format
isValidE164(phoneNumber: string): boolean

// Format for display (human-readable)
formatForDisplay(e164Number: string): string
```

**Supported Countries:** US, CA, GB, IN, MX, BR, DE, FR, IT, ES, AU, JP, CN, KR, NG, ZA

### 2. Phone MFA Service (`server/services/phoneMfaService.ts`)

**Core Methods:**

```typescript
// Enroll user in MFA (sends SMS code)
enrollPhoneMfa(
  userId: string,
  phoneNumber: string,
  countryCode: CountryCode
): Promise<{sessionId: string, message: string}>

// Verify phone with code
verifyPhoneCode(
  sessionId: string,
  verificationCode: string
): Promise<{success: boolean, userId: string, phoneNumber: string}>

// Send MFA code during login
sendLoginMfaCode(
  userId: string
): Promise<{sessionId: string, maskedPhone: string}>

// Verify MFA code during login
verifyLoginMfaCode(
  sessionId: string,
  verificationCode: string
): Promise<{success: boolean, userId: string}>

// Disable MFA
disableMfa(userId: string): Promise<void>

// Check MFA status
isMfaEnabled(userId: string): Promise<boolean>
```

**Rate Limiting:**

- Maximum 5 attempts per hour per user
- Tracked in-memory (use Redis in production)

**Session Management:**

- 10-minute expiry for verification sessions
- Stored in-memory (use Redis in production)

### 3. API Endpoints (`server/api/phoneMfa.ts`)

| Endpoint                     | Method | Auth Required | Description                   |
| ---------------------------- | ------ | ------------- | ----------------------------- |
| `/api/mfa/enroll`            | POST   | ✅            | Enroll in phone MFA           |
| `/api/mfa/verify`            | POST   | ✅            | Verify phone number with code |
| `/api/mfa/disable`           | POST   | ✅            | Disable MFA                   |
| `/api/mfa/status`            | GET    | ✅            | Get MFA status                |
| `/api/mfa/send-login-code`   | POST   | ❌            | Send MFA code during login    |
| `/api/mfa/verify-login-code` | POST   | ❌            | Verify MFA code during login  |

## Frontend Implementation

### 1. Components

#### `PhoneInput.tsx`

- International phone number input
- Country code selector with search
- Auto-formatting (e.g., US: (XXX) XXX-XXXX)
- Visual country flags
- Real-time validation

**Usage:**

```tsx
<PhoneInput
  value={phoneNumber}
  onChange={(phone, countryCode) => {
    setPhoneNumber(phone);
    setCountryCode(countryCode);
  }}
  error={error}
  placeholder="Enter phone number"
/>
```

#### `VerificationCodeInput.tsx`

- 6-digit code input
- Auto-focus next field
- Paste support
- Backspace navigation
- Auto-complete on full code

**Usage:**

```tsx
<VerificationCodeInput
  value={verificationCode}
  onChange={setVerificationCode}
  onComplete={(code) => verifyCode(code)}
  error={error}
/>
```

### 2. Screens

#### `PhoneMfaEnrollScreen.tsx`

Full enrollment flow with three states:

1. **Status View** - Shows current MFA status
2. **Enroll View** - Phone number input
3. **Verify View** - Code verification

**Features:**

- Check MFA status
- Enable/disable MFA
- Phone number entry with country selection
- SMS code verification
- Resend code functionality
- Error handling and user feedback

## Integration Steps

### Step 1: Run Database Migration

```bash
# From server directory
npm run migrate
```

Or manually:

```bash
psql -U postgres -d visaconnect -f server/db/migrations/009_add_phone_mfa.sql
```

### Step 2: Add Route to Application

Add to `src/App.tsx`:

```tsx
import PhoneMfaEnrollScreen from './screens/PhoneMfaEnrollScreen';

// Inside Routes
<Route
  path="/settings/mfa"
  element={
    <AuthenticatedRoute>
      <PhoneMfaEnrollScreen />
    </AuthenticatedRoute>
  }
/>;
```

### Step 3: Add Navigation Link

Add to user settings or profile menu:

```tsx
<Link
  to="/settings/mfa"
  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
>
  <svg className="w-5 h-5" /* ... */>
  Multi-Factor Authentication
</Link>
```

## Testing

### Manual Testing Checklist

#### Enrollment Flow

- [ ] Navigate to MFA settings
- [ ] View MFA status (should be disabled initially)
- [ ] Click "Enable MFA"
- [ ] Enter phone number with country code
- [ ] Submit and verify SMS code is "sent" (check console)
- [ ] Enter 6-digit code (any code works in demo)
- [ ] Verify MFA is enabled
- [ ] Phone number is displayed (masked)

#### Disable Flow

- [ ] Click "Disable MFA"
- [ ] Confirm dialog
- [ ] Verify MFA is disabled

#### Validation

- [ ] Try invalid phone number format
- [ ] Try phone number already in use
- [ ] Try expired verification session (wait 10 min)
- [ ] Try invalid verification code format
- [ ] Test rate limiting (6+ attempts in 1 hour)

### API Testing with cURL

**Enroll in MFA:**

```bash
curl -X POST http://localhost:8080/api/mfa/enroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "phoneNumber": "4155552671",
    "countryCode": "US"
  }'
```

**Verify Code:**

```bash
curl -X POST http://localhost:8080/api/mfa/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sessionId": "session_...",
    "verificationCode": "123456"
  }'
```

**Check Status:**

```bash
curl http://localhost:8080/api/mfa/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Disable MFA:**

```bash
curl -X POST http://localhost:8080/api/mfa/disable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Production Considerations

### 1. SMS Service Integration

The current implementation uses mock SMS sending. For production, integrate a service like:

- **Twilio** (Recommended)
- **AWS SNS**
- **Firebase Phone Auth**
- **Nexmo/Vonage**

**Example Twilio Integration:**

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendSms(phoneNumber: string, code: string) {
  await client.messages.create({
    body: `Your VisaConnect verification code is: ${code}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
}
```

### 2. Verification Code Generation

Implement secure code generation:

```typescript
import crypto from 'crypto';

function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}
```

### 3. Session Storage (Redis)

Replace in-memory sessions with Redis:

```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Store session
await redis.setex(
  `mfa:session:${sessionId}`,
  600, // 10 minutes
  JSON.stringify(sessionData)
);

// Get session
const data = await redis.get(`mfa:session:${sessionId}`);
```

### 4. Rate Limiting (Redis)

```typescript
async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `mfa:ratelimit:${userId}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 3600); // 1 hour
  }

  return count <= 5; // Max 5 attempts
}
```

### 5. Security Enhancements

- [ ] Add reCAPTCHA v2 to prevent bot attacks
- [ ] Implement IP-based rate limiting
- [ ] Add audit logging for MFA events
- [ ] Hash phone numbers in database
- [ ] Implement code expiry (5 minutes)
- [ ] Add max verification attempts (3)
- [ ] Implement account lockout after failures
- [ ] Add email notification on MFA changes

### 6. Environment Variables

Add to `.env`:

```bash
# SMS Service (Twilio example)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Redis
REDIS_URL=redis://localhost:6379

# reCAPTCHA
RECAPTCHA_SECRET_KEY=your_secret_key
```

## User Experience Considerations

### 1. Phone Number Display

Always mask phone numbers when displaying:

```typescript
const maskedPhone = phoneNumber.replace(/\d(?=\d{4})/g, '*');
// Result: +1********2671
```

### 2. Recovery Options

Provide recovery methods if user loses phone:

- Backup codes (generate on enrollment)
- Email recovery link
- Admin support process

### 3. International Support

- Support multiple country codes
- Clear formatting examples
- Validate based on country-specific rules

### 4. Accessibility

- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- Clear error messages

## Troubleshooting

### Common Issues

**Issue: Phone number already in use**

- Solution: Each phone can only be linked to one account

**Issue: Verification session expired**

- Solution: Sessions expire after 10 minutes, request new code

**Issue: Rate limit exceeded**

- Solution: Wait 1 hour or contact support

**Issue: Invalid phone format**

- Solution: Ensure E.164 format: +[country code][number]

## Future Enhancements

- [ ] Backup codes for account recovery
- [ ] Support for authenticator apps (TOTP)
- [ ] Biometric authentication option
- [ ] Remember trusted devices
- [ ] SMS-free alternatives (e.g., WhatsApp, Signal)
- [ ] Admin dashboard for MFA management
- [ ] MFA enforcement policies
- [ ] Multiple phone number support

## Support

For issues or questions:

- Check server logs for detailed error messages
- Review rate limiting status
- Verify database migration completed
- Confirm Firebase configuration
- Test with curl commands first

## References

- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164)
- [Firebase Phone Auth](https://firebase.google.com/docs/auth/web/phone-auth)
- [NIST MFA Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

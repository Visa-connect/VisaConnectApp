# reCAPTCHA Setup for Phone Authentication

## Overview

We've implemented reCAPTCHA v2 invisible widget integration to enable real SMS functionality with Firebase phone authentication.

## Environment Variables

Add these to your `.env` file:

```bash
# reCAPTCHA Site Key (from Google reCAPTCHA Console)
REACT_APP_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here

# Optional: reCAPTCHA Secret Key (for backend verification if needed)
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here
```

## Getting reCAPTCHA Keys

1. **Go to Google reCAPTCHA Console**: https://www.google.com/recaptcha/admin
2. **Create a new site**:
   - **Label**: "VisaConnect Phone Auth"
   - **reCAPTCHA type**: "reCAPTCHA v2" → "Invisible reCAPTCHA badge"
   - **Domains**: Add your domains:
     - `localhost` (for development)
     - `your-domain.com` (for production)
3. **Copy the Site Key** and add it to your `.env` file as `REACT_APP_RECAPTCHA_SITE_KEY`

## How It Works

### Frontend (React)

1. **RecaptchaProvider** wraps the login screen and loads the reCAPTCHA script
2. **useRecaptcha hook** provides functions to execute reCAPTCHA verification
3. **LoginScreen** calls `executeRecaptcha()` before sending SMS requests
4. **reCAPTCHA token** is included in the API request to the backend

### Backend (Node.js)

1. **phoneMfaService** accepts `recaptchaToken` parameter
2. **Firebase API calls** use the real reCAPTCHA token instead of test tokens
3. **Fallback to test tokens** if no reCAPTCHA token is provided (for development)

## Testing

### Development Testing

- If no reCAPTCHA token is provided, the system falls back to test mode
- Use test phone numbers: `+1 650-555-3434` with code `123456`

### Production Testing

- Real reCAPTCHA tokens are required for actual SMS sending
- Users will see the reCAPTCHA badge in the bottom-right corner
- reCAPTCHA verification happens automatically when sending SMS

## Troubleshooting

### "reCAPTCHA verification failed"

- Check that `REACT_APP_RECAPTCHA_SITE_KEY` is set correctly
- Ensure the domain is added to your reCAPTCHA site configuration
- Check browser console for reCAPTCHA loading errors

### "OPERATION_NOT_ALLOWED" (still occurring)

- Ensure phone authentication is enabled in Firebase Console
- Check that reCAPTCHA is properly configured in Firebase Console
- Verify the reCAPTCHA token is being sent to the backend

### SMS not being sent

- Check Firebase Console → Authentication → Settings → Authorized domains
- Ensure your domain is listed in authorized domains
- Verify reCAPTCHA token is valid and not expired

## Implementation Details

### Files Modified

- `src/hooks/useRecaptcha.ts` - reCAPTCHA hook
- `src/components/RecaptchaProvider.tsx` - reCAPTCHA context provider
- `src/screens/LoginScreen.tsx` - Integration with phone login
- `src/App.tsx` - Provider setup
- `server/api/phoneMfa.ts` - Backend API updates
- `server/services/phoneMfaService.ts` - Service layer updates

### Key Features

- **Invisible reCAPTCHA**: Users don't see the checkbox
- **Automatic verification**: reCAPTCHA executes automatically on form submit
- **Error handling**: Graceful fallback if reCAPTCHA fails
- **Development support**: Falls back to test tokens when no reCAPTCHA is available

## Next Steps

1. **Set up reCAPTCHA keys** in Google Console
2. **Add environment variables** to your `.env` file
3. **Test with real phone numbers** to verify SMS functionality
4. **Deploy to production** with proper domain configuration

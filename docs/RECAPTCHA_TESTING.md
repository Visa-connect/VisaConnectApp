# Testing reCAPTCHA Implementation

## Quick Test

1. **Add environment variables** to your backend `.env` file:

   ```bash
   # Backend .env
   RECAPTCHA_SITE_KEY=6Lc0X-QrAAAAALeq7oHiP6IK6C642fKGCeERAs8d
   RECAPTCHA_SECRET_KEY=your_secret_key_here
   ```

   **Note**: No frontend environment variables needed! The siteKey is fetched from the backend API.

2. **Start both servers**:

   ```bash
   # Terminal 1 - Backend
   cd server && yarn dev

   # Terminal 2 - Frontend
   yarn start
   ```

3. **Test the flow**:
   - Go to http://localhost:3000/sign-in
   - Enter your phone number (e.g., +1234567890)
   - Click "Send Code"
   - Check browser console for: "reCAPTCHA token obtained successfully"
   - Check backend logs for: "reCAPTCHA verification successful"

## Expected Console Output

### Frontend Console

```
reCAPTCHA script loaded and ready
reCAPTCHA token obtained successfully
```

### Backend Console

```
reCAPTCHA verification successful { score: 0.9, action: 'submit' }
Firebase SMS sent successfully
```

## Troubleshooting

### If reCAPTCHA fails:

- Check that `RECAPTCHA_SITE_KEY` is set in backend `.env`
- Verify the site key is valid in reCAPTCHA console
- Check browser network tab for `/api/config/public` endpoint
- Check browser network tab for reCAPTCHA script loading

### If SMS doesn't send:

- Check that `RECAPTCHA_SECRET_KEY` is set on backend
- Verify Firebase phone auth is enabled
- Check backend logs for Firebase errors

### For development/testing:

- The system will fall back to test mode if reCAPTCHA fails
- Test phone numbers work without real SMS
- Real phone numbers require valid reCAPTCHA

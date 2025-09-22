# Heroku Deployment Guide for VisaConnect

## Prerequisites

- Heroku CLI installed
- Heroku account with staging app created
- Firebase project configured

## Environment Variables Setup

Set these environment variables in your Heroku app:

```bash
# Firebase Service Account (required)
heroku config:set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'

# Environment
heroku config:set NODE_ENV=production
```

## Deployment Steps

1. **Login to Heroku:**

   ```bash
   heroku login
   ```

2. **Add Heroku remote:**

   ```bash
   heroku git:remote -a your-staging-app-name
   ```

3. **Deploy:**

   ```bash
   git push heroku main
   ```

4. **Open the app:**
   ```bash
   heroku open
   ```

## Custom Domain Setup

To use `staging.visconnectus.com`:

1. **Add custom domain in Heroku:**

   ```bash
   heroku domains:add staging.visconnectus.com
   ```

2. **Configure DNS:**
   - Add CNAME record pointing to your Heroku app URL
   - Example: `staging.visconnectus.com CNAME your-app-name.herokuapp.com`

## Build Process

The deployment automatically:

1. Installs dependencies
2. Builds the React client (`npm run build:client`)
3. Builds the TypeScript server (`npm run build:server`)
4. Starts the production server

## Troubleshooting

- Check logs: `heroku logs --tail`
- Restart app: `heroku restart`
- Check config: `heroku config`

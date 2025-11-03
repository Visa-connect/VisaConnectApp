# 🚀 CI/CD Pipeline Documentation

## Overview

This document describes the automated deployment pipeline for VisaConnect, which follows a **staging → production** deployment strategy.

## 🔄 Deployment Flow

```
Feature Branch → Staging Branch → Production
     ↓              ↓              ↓
  Feature/*     staging         main
  Bugfix/*      (staging.visaconnectus.com)
  Hotfix/*
  Develop
```

## 📋 Workflows

### 1. Feature Branch to Staging (`feature-deploy.yml`)

- **Trigger**: Push to `feature/*`, `bugfix/*`, `hotfix/*`, `develop`
- **Target**: `visa-connect-stage` (Staging)
- **Actions**:
  - Run tests and linting
  - Build application
  - Deploy to staging
  - Health check
  - Comment on PR (if applicable)

### 2. Staging Branch Deployment (`deploy-staging.yml`)

- **Trigger**: Push to `staging` branch
- **Target**: `visa-connect-stage` (Staging)
- **Actions**:
  - Run tests and linting
  - Build application
  - Deploy to staging
  - Health check
  - Comment on PR (if applicable)

### 3. Staging to Production (`deploy-production.yml`)

- **Trigger**: Manual workflow dispatch
- **Target**: `visa-connect` (Production)
- **Actions**:
  - Run tests and linting
  - Build application
  - Deploy to production
  - Health check
  - Success notification

## 🛠️ Setup Requirements

### GitHub Secrets

The following secrets must be configured in your GitHub repository:

1. **`HEROKU_API_KEY`**: Your Heroku API key

   - Get from: https://dashboard.heroku.com/account
   - Go to Settings → API Key

2. **`HEROKU_EMAIL`**: Your Heroku account email
   - The email associated with your Heroku account

### How to Set Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the required secrets

## 🚀 Deployment Process

### Feature Development

1. Create a feature branch: `git checkout -b feature/new-feature`
2. Make your changes and commit
3. Push to GitHub: `git push origin feature/new-feature`
4. **Automatically deploys to staging** 🎯
5. Test in staging environment
6. Create PR to merge to `staging` branch

### Staging Deployment

1. Merge feature branch to `staging`
2. **Automatically deploys to staging environment** 🎯
3. Test thoroughly in staging
4. When ready, manually trigger production deployment

### Production Deployment

1. Go to GitHub Actions → "Deploy Staging to Production"
2. Click "Run workflow"
3. **Manually deploys to production** 🎯

## 🔍 Environment URLs

- **Staging**: https://staging.visaconnectus.com
- **Production**: https://visaconnectus.com

## 📊 Health Checks

Each deployment includes automatic health checks:

- Waits for deployment to complete
- Tests the `/api/health` endpoint
- Fails deployment if health check fails

## 🧪 Testing

### Automated Tests

- **Linting**: ESLint checks for code quality
- **Unit Tests**: Jest runs test suite
- **Build Verification**: Ensures application builds successfully

### Manual Testing

- Test features in staging before production
- Verify API endpoints work correctly
- Check user flows and authentication

## 🚨 Troubleshooting

### Common Issues

1. **Deployment Fails**

   - Check GitHub Actions logs
   - Verify Heroku API key is correct
   - Ensure app names match exactly

2. **Health Check Fails**

   - Check Heroku logs: `heroku logs --tail --app visa-connect-stage`
   - Verify environment variables are set
   - Check database connectivity

3. **Build Fails**
   - Check for TypeScript errors
   - Verify all dependencies are installed
   - Check for linting errors

### Manual Deployment

If CI/CD fails, you can deploy manually:

```bash
# Deploy to staging
git push heroku-stage staging

# Deploy to production
git push heroku main
```

## 📈 Monitoring

### Deployment Status

- Check GitHub Actions tab for workflow status
- Monitor Heroku dashboard for app status
- Review deployment logs for any issues

### Performance

- Monitor response times in staging vs production
- Check for any performance regressions
- Monitor error rates and logs

## 🔒 Security

- API keys are stored as GitHub secrets
- Production deployments require manual approval
- Health checks verify application integrity
- Automated testing prevents broken deployments

## 📝 Best Practices

1. **Always test in staging first**
2. **Keep feature branches small and focused**
3. **Review PRs before merging to staging**
4. **Monitor deployments and health checks**
5. **Document any manual deployment steps**

## 🆘 Support

If you encounter issues:

1. Check GitHub Actions logs first
2. Review Heroku application logs
3. Verify environment configuration
4. Contact the development team

---

**Last Updated**: August 2025
**Version**: 1.0.0

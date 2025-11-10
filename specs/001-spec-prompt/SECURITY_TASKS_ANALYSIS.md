# Security Requirements Analysis: Tasks Mapping

**Date**: 2025-01-27  
**Source**: `specs/001-spec-prompt/tasks.md`  
**Reference**: VisaConnect Constitution (Principle 3 – Security Is Non-Negotiable)

## Security Requirements from Constitution

### Authentication & Authorization

- ✅ Firebase ID tokens with httpOnly refresh cookies
- ❌ Never store secrets in localStorage or source control
- ✅ 100% test coverage for critical auth flows

### Input Validation & Sanitization

- ✅ All data ingress must pass schema validation (Zod/JOI)
- ✅ Output sanitization
- ✅ Structured logging for validation errors

### Rate Limiting

- ✅ Rate limiting wraps public endpoints
- ⚠️ Requires implementation (not in current tasks.md)

### Secrets Management

- ✅ Secrets rotate quarterly
- ✅ Encrypt secrets via Heroku config vars
- ✅ Dependency audit (`npm audit --production` and `snyk test`) runs monthly and before releases

### Logging & Monitoring

- ✅ Log authentication anomalies
- ✅ Structured logging for actionable diagnostics

### Testing

- ✅ 100% coverage for critical auth flows
- ✅ Integration tests for authentication
- ✅ E2E tests for authentication flows

---

## Tasks Fulfilling Security Requirements

### ✅ Authentication & Token Security

#### **T009** - Audit refresh token flow for secure httpOnly cookies

- **Status**: ✅ Completed
- **Security Domain**: Authentication & Authorization
- **Constitution Compliance**:
  - ✅ "Authentication relies on Firebase ID tokens with httpOnly refresh cookies"
  - ✅ "Never store secrets in localStorage"
- **Impact**: Ensures refresh tokens are stored securely in httpOnly cookies, preventing XSS attacks
- **Files**: `server/api/auth.ts`

#### **T010** - Update API client to rely on cookie-based flow

- **Status**: ✅ Completed
- **Security Domain**: Authentication & Authorization
- **Constitution Compliance**:
  - ✅ "Never store secrets in localStorage or source control"
  - ✅ Removes localStorage fallback for refresh tokens
- **Impact**: Eliminates client-side token storage vulnerabilities
- **Files**: `src/api/index.ts`

#### **T011** - Backend refresh token integration tests

- **Status**: ✅ Completed
- **Security Domain**: Testing (Authentication)
- **Constitution Compliance**:
  - ✅ "100% coverage for critical auth flows"
  - ✅ "Integration tests MUST accompany contract changes"
- **Impact**: Validates secure cookie handling in backend
- **Files**: `server/tests/api/auth.refresh-token.test.ts`

#### **T021** - Client-side refresh token E2E test

- **Status**: ✅ Completed
- **Security Domain**: Testing (Authentication)
- **Constitution Compliance**:
  - ✅ "100% coverage for critical auth flows"
  - ✅ "End-to-end smoke tests MUST pass before deploy"
- **Impact**: Validates secure cookie flow end-to-end
- **Files**: `src/tests/e2e/auth-refresh.e2e.ts`

---

### ✅ Input Validation & Error Handling

#### **T005** - Create validation utility for prompt inputs

- **Status**: ⏳ Pending
- **Security Domain**: Input Validation
- **Constitution Compliance**:
  - ✅ "All data ingress must pass schema validation"
  - ✅ Supports input validation framework
- **Impact**: Prevents malformed inputs from reaching processing logic
- **Files**: `.specify/scripts/lib/promptValidation.ts`

#### **T006** - Wire validation into SpecKit feature script

- **Status**: ⏳ Pending
- **Security Domain**: Input Validation
- **Constitution Compliance**:
  - ✅ "All data ingress must pass schema validation"
- **Impact**: Enforces validation at entry point
- **Files**: `.specify/scripts/bash/create-new-feature.sh`

#### **T039** - Audit backend service validation rules and structured logging

- **Status**: ✅ Completed
- **Security Domain**: Input Validation, Logging
- **Constitution Compliance**:
  - ✅ "All data ingress must pass schema validation (Zod/JOI)"
  - ✅ "Log authentication anomalies"
  - ✅ "Structured logging for actionable diagnostics"
- **Impact**: Ensures all API inputs are validated and errors are logged securely
- **Files**: `server/api/auth.ts`, `server/services/authService.ts`

#### **T040** - Audit client-side validation and logging

- **Status**: ✅ Completed
- **Security Domain**: Input Validation, Logging
- **Constitution Compliance**:
  - ✅ "All data ingress must pass schema validation"
  - ✅ "Structured logging for actionable diagnostics"
- **Impact**: Ensures client-side validation and secure error handling
- **Files**: `src/api/index.ts`, `src/screens/LoginScreen.tsx`

---

### ✅ Secrets Management & Dependency Security

#### **T036** - Automate monthly security scan workflow

- **Status**: ⏳ Pending
- **Security Domain**: Dependency Security, Secrets Management
- **Constitution Compliance**:
  - ✅ "Dependency audit (`npm audit --production` and `snyk test`) runs monthly and before releases"
- **Impact**: Automates security scanning for vulnerabilities
- **Files**: `.github/workflows/speckit-security.yml`

---

### ✅ Logging & Audit Trail

#### **T004** - Initialize prompt execution log with rotation

- **Status**: ⏳ Pending
- **Security Domain**: Logging & Audit
- **Constitution Compliance**:
  - ✅ "Log authentication anomalies"
  - ✅ Supports audit trail for compliance
- **Impact**: Provides audit trail for spec generation activities
- **Files**: `specs/logs/speckit.log`

#### **T007** - Establish JSON logging helper

- **Status**: ⏳ Pending
- **Security Domain**: Logging
- **Constitution Compliance**:
  - ✅ "Structured logging for actionable diagnostics"
- **Impact**: Standardizes logging format for security events
- **Files**: `.specify/scripts/lib/promptLogger.ts`

#### **T008** - Integrate logging helper into SpecKit script

- **Status**: ⏳ Pending
- **Security Domain**: Logging
- **Constitution Compliance**:
  - ✅ "Structured logging for actionable diagnostics"
- **Impact**: Ensures all spec generation events are logged
- **Files**: `.specify/scripts/bash/create-new-feature.sh`

---

### ✅ Governance & Compliance

#### **T028** - Add governance compliance audit script

- **Status**: ⏳ Pending
- **Security Domain**: Governance, Compliance
- **Constitution Compliance**:
  - ✅ "Compliance review occurs quarterly"
  - ✅ "Audit results filed in `/docs/security/`"
- **Impact**: Automates security compliance checks
- **Files**: `.specify/scripts/analysis/governance-audit.ts`

#### **T029** - Wire audit script into CI pipeline

- **Status**: ⏳ Pending
- **Security Domain**: Governance, Compliance
- **Constitution Compliance**:
  - ✅ "Tests run in CI on every PR; red builds block merges"
  - ✅ Enforces security checks in CI
- **Impact**: Blocks insecure code from being merged
- **Files**: `.github/workflows/ci.yml`

#### **T033** - Review constitution alignment and update prompt defaults

- **Status**: ⏳ Pending
- **Security Domain**: Governance
- **Constitution Compliance**:
  - ✅ Ensures security defaults are baked into generated specs
- **Impact**: Propagates security mandates to all new features
- **Files**: `.specify/templates/helpers/sectionGenerators.ts`

#### **T034** - Conduct quarterly dry-run checklist

- **Status**: ⏳ Pending
- **Security Domain**: Governance, Compliance
- **Constitution Compliance**:
  - ✅ "Compliance review occurs quarterly"
- **Impact**: Regular security compliance validation
- **Files**: `specs/logs/governance-audit-YYYY-QX.md`

---

## Security Requirements NOT Yet Addressed in Tasks

### ⚠️ Rate Limiting

- **Requirement**: "Rate limiting wraps public endpoints"
- **Status**: Not in tasks.md
- **Recommendation**: Add task to implement rate limiting for:
  - `/api/auth/login`
  - `/api/auth/register`
  - `/api/auth/refresh-token`
  - `/api/auth/reset-password`
- **Priority**: High (prevents brute force attacks)

### ⚠️ Output Sanitization

- **Requirement**: "Output sanitization"
- **Status**: Partially addressed (T039/T040 audit)
- **Recommendation**: Add explicit task to implement output sanitization for:
  - User-generated content (posts, comments, messages)
  - API responses containing user data
  - Error messages (prevent information disclosure)
- **Priority**: High (prevents XSS attacks)

### ⚠️ CSRF Protection

- **Requirement**: Implied by "Security-First Approach"
- **Status**: Not explicitly addressed
- **Recommendation**: Add task to implement CSRF tokens for state-changing operations
- **Priority**: Medium (important for production)

### ⚠️ Secrets Rotation

- **Requirement**: "Secrets rotate quarterly"
- **Status**: Not in tasks.md
- **Recommendation**: Add task to document and automate secrets rotation process
- **Priority**: Medium (compliance requirement)

### ⚠️ Data Retention (GDPR)

- **Requirement**: "Ensure data retention per GDPR-like defaults (delete on request)"
- **Status**: Not in tasks.md
- **Recommendation**: Add task to implement data deletion endpoints and retention policies
- **Priority**: Medium (compliance requirement)

---

## Summary

### ✅ Completed Security Tasks (5)

- T009: httpOnly cookie audit
- T010: Cookie-based client flow
- T011: Backend refresh token tests
- T021: Client-side E2E auth tests
- T039: Backend validation audit
- T040: Client-side validation audit

### ⏳ Pending Security Tasks (10)

- T004: Execution log with rotation
- T005: Validation utility
- T006: Wire validation
- T007: JSON logging helper
- T008: Integrate logging
- T028: Governance audit script
- T029: CI audit integration
- T033: Constitution alignment
- T034: Quarterly checklist
- T036: Monthly security scan

### ⚠️ Missing Security Tasks (5)

- Rate limiting implementation
- Output sanitization implementation
- CSRF protection
- Secrets rotation automation
- GDPR data retention

---

## Recommendations

1. **High Priority**: Add tasks for rate limiting and output sanitization (critical for production)
2. **Medium Priority**: Add tasks for CSRF protection and secrets rotation (compliance)
3. **Low Priority**: Add task for GDPR data retention (compliance, but can be phased)

## Next Steps

1. Review this analysis with the team
2. Prioritize missing security tasks
3. Add missing tasks to `tasks.md`
4. Update production readiness plan to include security hardening tasks

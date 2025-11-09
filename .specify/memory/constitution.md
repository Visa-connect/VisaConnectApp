<!--
Sync Impact Report
Version change: 0.0.0 → 1.0.0
Modified principles: None (initial issue)
Added sections: Standards Playbook, Developer Enablement
Removed sections: None
Templates requiring updates:
 - .specify/templates/plan-template.md ✅
 - .specify/templates/spec-template.md ✅
 - .specify/templates/tasks-template.md ✅
Follow-up TODOs: None
-->

# VisaConnect Constitution

VisaConnect is a React + TypeScript web platform with a Node.js/Express backend, PostgreSQL persistence, and Heroku hosting. The product is past MVP and preparing for production launch at `www.visaconnectus.com`. This constitution guides Arron (solo developer), future teammates, and AI collaborators so that every improvement protects user trust while enabling rapid iteration.

## Core Principles

### Principle 1 – Build Quality That Scales

- **Mandates**
  - Favor reusable abstractions only when three concrete use-cases exist; until then, duplicate with intention and leave TODOs.
  - Every PR MUST include purposeful naming, docstrings for non-trivial functions, and updated README/spec sections when behavior changes.
  - Reviews MUST block code that bypasses linting, violates DRY without justification, or introduces untyped paths.
- **Rationale**: Production polish depends on legible, evolvable code. Guardrails around reuse, naming, and documentation reduce onboarding friction and regression risk as the team grows.

### Principle 2 – Test Before Trust

- **Mandates**
  - New backend logic requires unit coverage ≥90%; frontend components require story-driven tests (React Testing Library) for critical flows.
  - Integration tests MUST accompany contract changes, and end-to-end smoke tests MUST pass before deploy.
  - Tests run in CI on every PR; red builds block merges. TDD encouraged for new modules; at minimum, write the test in the same PR.
- **Rationale**: Consistent automated testing is the cheapest insurance against regressions across a distributed product surface.

### Principle 3 – Security Is Non-Negotiable

- **Mandates**
  - Authentication relies on Firebase ID tokens with httpOnly refresh cookies; never store secrets in localStorage or source control.
  - All data ingress must pass schema validation (Zod/JOI) and output sanitization; rate limiting wraps public endpoints.
  - Secrets rotate quarterly; dependency audit (`npm audit --production` and `snyk test`) runs monthly and before releases.
- **Rationale**: Visa workers entrust sensitive data; strong defaults prevent catastrophic breaches and align with long-term compliance.

### Principle 4 – Architect for Change

- **Mandates**
  - Follow a feature-sliced architecture: screens → components → hooks/services. Backend layers separate API, service, repository.
  - Database migrations (Knex) accompany schema changes, include rollback scripts, and run in staging before production.
  - Introducing new dependencies requires recorded evaluation (trade-offs, maintenance plan) in `/docs/decisions/`.
- **Rationale**: Clear boundaries enable parallel work, faster debugging, and deliberate evolution of the platform.

### Principle 5 – Delight Through Accessible, Performant Delivery

- **Mandates**
  - UI changes MUST meet WCAG 2.1 AA: keyboard access, focus rings, aria labels, 4.5:1 contrast, and ≥44px interactive targets.
  - Perceived performance targets: <2.5s first contentful paint, <1s interactive nav, API p95 <400ms, DB queries use indexes.
  - Deployments include monitoring hooks (Sentry, Logfire) and rollback plans; post-release verify smoke and analytics dashboards.
- **Rationale**: A global community expects fast, inclusive experiences; quality-of-service directly impacts adoption and retention.

## Standards Playbook

### Code Quality Standards

- **Rules**: Enforce ESLint + Prettier with TypeScript strict mode; forbid `any` without justification comment; require business logic in services/hooks rather than screens.
- **Checklist**:
  - [ ] Added/updated docs or inline ADR link.
  - [ ] Confirmed no TODO without owner/date.
  - [ ] Reviewed for reuse vs duplication decision note.
- **Why**: Ensures consistent expectations and situational awareness for future contributors.

### Testing Standards

- **Rules**: Adopt TDD for net-new modules; maintain coverage thresholds (backend 90%, frontend 80% lines, 100% for critical auth flows); snapshot tests only for stable visual components; prefer mocks for external services, real DB for integration.
- **Checklist**:
  - [ ] Unit and integration tests run locally.
  - [ ] E2E smoke (Playwright) scenario updated when UX changes.
  - [ ] Regression suite documented in `/docs/testing.md`.
- **Why**: Balances confidence with execution speed while preventing brittle tests.

### Security-First Approach

- **Rules**: Use `helmet`, `cors`, `express-rate-limit`; encrypt secrets via Heroku config vars; log authentication anomalies; ensure data retention per GDPR-like defaults (delete on request).
- **Checklist**:
  - [ ] Input/output validation in place.
  - [ ] Secrets live only in env/cookie; refresh rotation recorded.
  - [ ] Audit results filed in `/docs/security/`.
- **Why**: Protects users and satisfies partner due diligence.

### Architecture Decisions

- **Rules**: Document decisions using ADR template; prefer event-driven patterns only with clear producers/consumers; state management uses Zustand for global state, React Query for server cache; avoid over-segmentation of microservices until scale demands.
- **Checklist**:
  - [ ] New modules follow layered boundaries.
  - [ ] Database changes include ER diagram update.
  - [ ] Dependency evaluations stored in decision log.
- **Why**: Maintains cohesion and prevents architecture drift.

### Accessibility Standards

- **Rules**: All interactive elements have aria roles/labels; ensure focus trap for modals; run automated (axe) and manual keyboard reviews per sprint; color palette documented in design tokens.
- **Checklist**:
  - [ ] Axe scan passes.
  - [ ] Keyboard walk-through recorded.
  - [ ] Color contrast validated via tokens.
- **Why**: Accessibility is both ethical and required for future enterprise adoption.

### User Experience Consistency

- **Rules**: Use shared component library in `src/components`; align copy, spacing, and motion with Figma tokens; provide friendly error and success messaging; ensure loading and empty states exist for each async flow; mobile breakpoints tested at 320px, 768px, 1024px.
- **Checklist**:
  - [ ] Component diff reviewed with design system.
  - [ ] Errors mapped to human-readable notifications.
  - [ ] Responsive screenshots captured.
- **Why**: Consistency builds trust and reduces support load.

### Performance Requirements

- **Rules**: Analyze bundle with `webpack-bundle-analyzer`; lazy-load routes/screens beyond the fold; memoize expensive selectors; index DB queries and monitor slow query log; cache frequent reads (Redis when necessary).
- **Checklist**:
  - [ ] Lighthouse score ≥90 performance.
  - [ ] Backend profiling shows p95 <400ms.
  - [ ] Query plan reviewed for new SQL.
- **Why**: Guarantees reliable experience across devices and geographies.

### Production Readiness

- **Rules**: Follow deployment checklist (tests, migrations, feature flags, monitoring); maintain runbooks for incidents and recovery; nightly backups via Heroku PG; ensure scaling plan documented for dyno tiers and DB sizing.
- **Checklist**:
  - [ ] Release checklist signed.
  - [ ] Monitoring dashboards updated.
  - [ ] Backups verified within last 7 days.
- **Why**: Minimizes downtime risk and accelerates incident response.

## Developer Enablement

### Code Style

- **Rules**: Use commit format `type(scope): summary` (e.g., `feat(auth): add mfa enrollment`); group imports (stdlib, third-party, internal) separated by blank lines; prefer `null` over `undefined`; comments explain intent, not restate code.
- **Why**: Uniform style simplifies reviews and git archaeology.
- **Quick Reference**:
  - [ ] `npm run lint` clean.
  - [ ] Commit message matches conventional style.
  - [ ] File headers include relevant TODO links.

### Developer Onboarding

- **Guidance**: New contributors follow `/docs/quickstart.md`, review architecture overview, and read the latest ADR digest. First-week task: ship a small bugfix with tests and monitoring note.
- **Support**: Maintain glossary of domain terms, shared env setup script, and mentorship pairing.
- **Why**: Accelerates ramp-up and establishes quality culture early.

## Governance

- This constitution supersedes informal practices; all workstreams must reference it in planning (see plan-template Constitution Check).
- Amendments require: (1) proposal PR with rationale, (2) review from product owner (Arron) plus one technical reviewer, (3) updated version tag and sync impact comment.
- Versioning follows SemVer (MAJOR for breaking governance changes, MINOR for new principles/sections, PATCH for clarifications).
- Compliance review occurs quarterly; violations must be logged in plan/task artifacts with mitigation timeline.
- Runtime guidance lives in `/docs/runtime.md`; discrepancies trigger constitution updates or explicit exceptions.

**Version**: 1.0.0 | **Ratified**: 2025-11-09 | **Last Amended**: 2025-11-09

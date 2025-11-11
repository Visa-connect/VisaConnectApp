# Task Plan: Specification Prompt Generator

## Phase 1 – Setup & Tooling Baseline

- [x] T001 Verify SpecKit scripts executable (`chmod +x .specify/scripts/bash/*.sh`)
- [x] T002 Install dependencies (`yarn install`) and confirm lint/test baseline (`yarn lint && yarn test --runInBand`)
- [x] T003 Configure prompt profiling script scaffold in `.specify/scripts/analysis/profile-specprompt.ts`
- [x] T004 Initialize prompt execution log at `specs/logs/speckit.log` with rotation README entry

## Phase 2 – Foundational Infrastructure

- [x] T005 Create validation utility for prompt inputs in `.specify/scripts/lib/promptValidation.ts`
- [x] T006 Wire validation into SpecKit feature script `.specify/scripts/bash/create-new-feature.sh`
- [x] T007 Establish JSON logging helper `.specify/scripts/lib/promptLogger.ts`
- [x] T008 Integrate logging helper into `.specify/scripts/bash/create-new-feature.sh`
- [x] T009 Audit refresh token flow to ensure secure httpOnly cookies in `server/api/auth.ts` (path set to `/api/auth` for login/refresh endpoints)
- [x] T010 Update API client refresh handling in `src/api/index.ts` to rely on cookie-based flow and remove localStorage fallback
- [x] T011 Implement backend refresh token integration tests in `server/tests/api/auth.refresh-token.test.ts`

## Phase 3 – User Story 1: Generate Comprehensive Spec Draft (Priority: P1)

- [ ] T012 [US1] Implement reusable section generators in `.specify/templates/helpers/sectionGenerators.ts`
- [ ] T013 [US1] Update spec template `specs/001-spec-prompt/spec.md` placeholders to call generators
- [ ] T014 [US1] Ensure constitution references auto-inserted in sections via `.specify/templates/helpers/governanceLinks.ts`
- [ ] T015 [US1] Enhance quality checklist generator `specs/001-spec-prompt/checklists/requirements.md` logic for auto status
- [ ] T016 [US1] Update Quickstart docs `specs/001-spec-prompt/quickstart.md` with generator usage guidance
- [ ] T017 [US1] Add regression snapshots in `specs/__tests__/specPrompt.test.ts`
- [ ] T018 [US1] Document independent verification steps in `docs/runtime-specprompt.md`
- [ ] T019 [US1] Implement SpecKit integration test harness in `.specify/scripts/tests/integration.specprompt.test.ts`
- [ ] T020 [US1] Add end-to-end smoke test for `/speckit.specify → /speckit.plan` flow in `specs/__tests__/specPrompt.e2e.test.ts`
- [x] T021 [US1] Add client-side refresh token e2e test covering cookie flow in `src/tests/e2e/auth-refresh.e2e.ts`

## Phase 4 – User Story 2: Surface Clarification Needs (Priority: P2)

- [ ] T022 [US2] Implement clarification limiter in `.specify/scripts/lib/clarificationManager.ts`
- [ ] T023 [US2] Update `/speckit.clarify` flow to use limiter (`.specify/scripts/bash/clarify-feature.sh`)
- [ ] T024 [US2] Render clarification tables with recommendation banner in `.specify/templates/helpers/clarificationTable.ts`
- [ ] T025 [US2] Add unit tests covering limiter behaviour `specs/__tests__/clarificationManager.test.ts`
- [ ] T026 [US2] Update documentation `specs/001-spec-prompt/spec.md` Clarifications section with limiter reference

## Phase 5 – User Story 3: Enforce Governance Consistency (Priority: P3)

- [ ] T027 [US3] Inject constitution pillar mapping into generated requirements `specs/001-spec-prompt/spec.md`
- [ ] T028 [US3] Add governance compliance audit script `.specify/scripts/analysis/governance-audit.ts`
- [ ] T029 [US3] Wire audit script into CI pipeline (`.github/workflows/ci.yml`)
- [ ] T030 [US3] Update monitoring dashboards documentation `docs/runtime-specprompt.md` with audit metrics

## Phase 6 – Polish & Cross-Cutting

- [ ] T031 [P] Add profiling benchmarks to `specs/reports/specprompt-benchmark.md`
- [ ] T032 Refine logging rotation script `yarn speckit:logs:rotate`
- [ ] T033 Review constitution alignment and update prompt defaults for new mandates
- [ ] T034 Conduct quarterly dry-run checklist and capture findings `specs/logs/governance-audit-YYYY-QX.md`
- [ ] T035 Create SpecKit release checklist at `docs/checklists/speckit-release.md`
- [x] T036 Automate monthly security scan workflow in `.github/workflows/speckit-security.yml`
- [ ] T037 Capture SpecKit usage metrics in `docs/runtime-specprompt.md#metrics` and dashboard config
- [ ] T038 Implement template drift watchdog script `specs/scripts/template-drift-check.ts` with weekly log
- [x] T039 Audit backend service validation rules and structured logging to ensure all API inputs, especially refresh-token flows, provide actionable diagnostics.
- [x] T040 Audit client-side validation and logging for authentication flows so UI surfaces meaningful errors and network retries are traceable.

## Phase 7 – Security Hardening (Production Readiness)

- [x] T041 Implement rate limiting for public auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/refresh-token`, `/api/auth/reset-password`) using `express-rate-limit` middleware in `server/middleware/rateLimit.ts`
- [x] T042 Implement output sanitization for user-generated content (posts, comments, messages) and API responses in `server/utils/sanitization.ts`
- [x] T043 Implement CSRF protection for state-changing operations (POST, PUT, DELETE, PATCH) using CSRF tokens in `server/middleware/csrf.ts`
- [ ] T044 Document and automate secrets rotation process with quarterly rotation schedule in `docs/security/secrets-rotation.md`
- [ ] T045 Implement GDPR data retention and deletion endpoints (`/api/auth/delete-account`, `/api/user/data-export`) with retention policies in `server/api/dataRetention.ts`

## Phase 8 – Performance Optimization (Production Readiness)

### Frontend Performance (High Priority)

- [x] T046 Analyze and optimize bundle size using `source-map-explorer` in `package.json` scripts (`build:analyze`, `build:analyze:json`), identify large dependencies, implement code splitting, and optimize imports with tree-shaking
- [x] T047 Implement lazy loading for routes/screens beyond the fold using `React.lazy()` and `Suspense` boundaries, optimize image loading with lazy loading and responsive images
- [ ] T048 Implement memoization for expensive selectors and computations using `React.useMemo()` and `React.useCallback()`, optimize Zustand and React Query selectors
- [x] T049 Optimize Core Web Vitals tracking: enhanced `reportWebVitals.ts` to send metrics to Sentry, track FCP, LCP, CLS, TTI, TBT, and INP. Note: Full Lighthouse optimization requires runtime testing and iterative improvements.

### Backend Performance (High Priority)

- [x] T050 Profile API endpoints and optimize response times: implemented performance monitoring middleware (`server/middleware/performanceMonitoring.ts`) that tracks all API response times, logs slow requests (>400ms), and reports to Sentry. Connection pooling already configured in `server/db/config.ts`. Note: Full optimization requires identifying and fixing slow endpoints based on monitoring data.
- [ ] T051 Optimize database queries: audit all database queries, add indexes for frequently queried fields, review query plans for new SQL, set up slow query logging, optimize N+1 queries, implement query result caching
- [ ] T052 Implement Redis caching for frequent reads: evaluate caching needs, set up Redis (if needed), implement caching for user profiles, job listings, company reviews, and unread notification counts, implement cache invalidation strategy, monitor cache hit rates

### Performance Monitoring & Observability

- [x] T053 Set up performance monitoring: configured Sentry BrowserTracing for frontend (already in `src/index.tsx`), enhanced Core Web Vitals tracking in `src/reportWebVitals.ts`, implemented API response time monitoring in `server/middleware/performanceMonitoring.ts`. Note: Alerts and dashboards require Sentry configuration in production environment.

### SpecKit Performance (Medium Priority)

- [ ] T031 [P] Add profiling benchmarks to `specs/reports/specprompt-benchmark.md`
- [ ] T054 Optimize SpecKit runtime and memory usage: profile prompt execution to ensure <10s generation, introduce caching for repeated constitution lookups, parallelize optional analyses, target <200MB memory footprint

## Dependencies & Execution Order

1. Phase 1 → Phase 2 (setup before wiring validation/logging)
2. Phase 2 → Phase 3 (infrastructure precedes core generation)
3. Phase 3 → Phase 4 (clarification logic depends on generators)
4. Phase 4 → Phase 5 (governance enforcement needs limiter outputs)
5. Phase 6 can start after Phase 3 for parallel polish except tasks 031-036 which follow audit, CI, and security setup.
6. Phase 7 can start after Phase 2 (security hardening can proceed in parallel with core development, but T041-T043 are critical for production).
7. Phase 8 can start after Phase 2 (performance optimization can proceed in parallel, but T050-T051 are critical for production scalability).

## Parallel Opportunities

- T001–T003 can run concurrently (distinct paths).
- T005 and T007 develop independently; integrate after both complete.
- T009 and T010 can run in parallel (backend vs frontend adjustments).
- Within User Story 1, T011 and T013 parallelize (separate helper modules).
- Phase 6 task T029 can run alongside Phase 4 implementation.
- T041, T042, and T043 can run in parallel (distinct security middleware implementations).
- T044 and T045 can run in parallel (documentation and implementation tasks).
- T046, T047, and T048 can run in parallel (frontend performance optimizations).
- T050 and T051 can run in parallel (backend performance optimizations, but T051 should complete before T052).
- T053 can run in parallel with other performance tasks (monitoring setup).
- T031 and T054 can run in parallel (SpecKit performance optimizations).

## Independent Test Criteria

- **US1**: Generate spec from sample feature; verify all sections populated and regression snapshots pass.
- **US2**: Trigger `/speckit.clarify` with >3 ambiguities; confirm limiter enforces cap and tables include recommendations.
- **US3**: Run governance audit script; confirm requirements map to constitution pillars and CI gate triggers on missing mapping.

## MVP Scope

Deliver Phases 1–3 to enable reliable spec generation with governance-aligned content and secure refresh token handling. Subsequent phases enhance clarification workflow and ongoing compliance.

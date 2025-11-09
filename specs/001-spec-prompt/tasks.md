# Task Plan: Specification Prompt Generator

## Phase 1 – Setup & Tooling Baseline
- [ ] T001 Verify SpecKit scripts executable (`chmod +x .specify/scripts/bash/*.sh`)
- [ ] T002 Install dependencies (`yarn install`) and confirm lint/test baseline (`yarn lint && yarn test --runInBand`)
- [ ] T003 Configure prompt profiling script scaffold in `.specify/scripts/analysis/profile-specprompt.ts`
- [ ] T004 Initialize prompt execution log at `specs/logs/speckit.log` with rotation README entry

## Phase 2 – Foundational Infrastructure
- [ ] T005 Create validation utility for prompt inputs in `.specify/scripts/lib/promptValidation.ts`
- [ ] T006 Wire validation into SpecKit feature script `.specify/scripts/bash/create-new-feature.sh`
- [ ] T007 Establish JSON logging helper `.specify/scripts/lib/promptLogger.ts`
- [ ] T008 Integrate logging helper into `.specify/scripts/bash/create-new-feature.sh`

## Phase 3 – User Story 1: Generate Comprehensive Spec Draft (Priority: P1)
- [ ] T009 [US1] Implement reusable section generators in `.specify/templates/helpers/sectionGenerators.ts`
- [ ] T010 [US1] Update spec template `specs/001-spec-prompt/spec.md` placeholders to call generators
- [ ] T011 [US1] Ensure constitution references auto-inserted in sections via `.specify/templates/helpers/governanceLinks.ts`
- [ ] T012 [US1] Enhance quality checklist generator `specs/001-spec-prompt/checklists/requirements.md` logic for auto status
- [ ] T013 [US1] Update Quickstart docs `specs/001-spec-prompt/quickstart.md` with generator usage guidance
- [ ] T014 [US1] Add regression snapshots in `specs/__tests__/specPrompt.test.ts`
- [ ] T015 [US1] Document independent verification steps in `docs/runtime-specprompt.md`

## Phase 4 – User Story 2: Surface Clarification Needs (Priority: P2)
- [ ] T016 [US2] Implement clarification limiter in `.specify/scripts/lib/clarificationManager.ts`
- [ ] T017 [US2] Update `/speckit.clarify` flow to use limiter (`.specify/scripts/bash/clarify-feature.sh`)
- [ ] T018 [US2] Render clarification tables with recommendation banner in `.specify/templates/helpers/clarificationTable.ts`
- [ ] T019 [US2] Add unit tests covering limiter behaviour `specs/__tests__/clarificationManager.test.ts`
- [ ] T020 [US2] Update documentation `specs/001-spec-prompt/spec.md` Clarifications section with limiter reference

## Phase 5 – User Story 3: Enforce Governance Consistency (Priority: P3)
- [ ] T021 [US3] Inject constitution pillar mapping into generated requirements `specs/001-spec-prompt/spec.md`
- [ ] T022 [US3] Add governance compliance audit script `.specify/scripts/analysis/governance-audit.ts`
- [ ] T023 [US3] Wire audit script into CI pipeline (`.github/workflows/ci.yml`)
- [ ] T024 [US3] Update monitoring dashboards documentation `docs/runtime-specprompt.md` with audit metrics

## Phase 6 – Polish & Cross-Cutting
- [ ] T025 [P] Add profiling benchmarks to `specs/reports/specprompt-benchmark.md`
- [ ] T026 Refine logging rotation script `yarn speckit:logs:rotate`
- [ ] T027 Review constitution alignment and update prompt defaults for new mandates
- [ ] T028 Conduct quarterly dry-run checklist and capture findings `specs/logs/governance-audit-YYYY-QX.md`

## Dependencies & Execution Order
1. Phase 1 → Phase 2 (setup before wiring validation/logging)  
2. Phase 2 → Phase 3 (infrastructure precedes core generation)  
3. Phase 3 → Phase 4 (clarification logic depends on generators)  
4. Phase 4 → Phase 5 (governance enforcement needs limiter outputs)  
5. Phase 6 can start after Phase 3 for parallel polish except tasks 027-028 which follow audit setup.

## Parallel Opportunities
- T001–T003 can run concurrently (distinct paths).  
- T005 and T007 develop independently; integrate after both complete.  
- Within User Story 1, T009 and T011 parallelize (separate helper modules).  
- Phase 6 task T025 can run alongside Phase 4 implementation.

## Independent Test Criteria
- **US1**: Generate spec from sample feature; verify all sections populated and regression snapshots pass.  
- **US2**: Trigger `/speckit.clarify` with >3 ambiguities; confirm limiter enforces cap and tables include recommendations.  
- **US3**: Run governance audit script; confirm requirements map to constitution pillars and CI gate triggers on missing mapping.

## MVP Scope
Deliver Phases 1–3 to enable reliable spec generation with governance-aligned content. Subsequent phases enhance clarification workflow and ongoing compliance.

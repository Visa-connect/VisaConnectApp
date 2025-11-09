# Quickstart – Specification Prompt Generator

## Prerequisites
- Node.js 18 LTS and Yarn installed.  
- Repo cloned with access to `.specify` scripts.  
- Read the [VisaConnect Constitution](../../.specify/memory/constitution.md).

## Setup Steps
1. Install dependencies: `yarn install`.  
2. Ensure SpecKit scripts are executable: `chmod +x .specify/scripts/bash/*.sh`.  
3. Run lint/tests baseline: `yarn lint && yarn test --runInBand`.

## Daily Workflow
1. Create/update spec: `/speckit.specify "<feature description>"`.  
2. Resolve ambiguities: `/speckit.clarify`.  
3. Generate plan artifacts: `/speckit.plan`.  
4. Update tasks backlog: `/speckit.tasks` (after plan approval).  
5. Commit artifacts per Conventional Commits (`docs:` for specs, `chore:` for scripts).

## Testing the Prompt
- Execute `yarn test specs/__tests__/specPrompt.test.ts` to validate regression snapshots.  
- Regenerate snapshots deliberately: `yarn test specs/__tests__/specPrompt.test.ts -u` followed by reviewer sign-off.  
- Manual smoke: trigger `/speckit.specify` with sample inputs (security feature, UX polish, bug fix) and confirm outputs.

## Monitoring & Logging
- Prompt executions append JSON lines to `specs/logs/speckit.log`.  
- Review log weekly; rotate using `yarn speckit:logs:rotate`.  
- CI uploads logs as artifacts for audit.

## Troubleshooting
- **Missing constitution references**: run `git pull` to sync `.specify/memory/constitution.md`.  
- **Snapshot mismatch**: inspect diff, update serializers if formatting-only change.  
- **Permission errors**: ensure scripts executed with `bash` from repo root.  
- **Slow generation (>10s)**: run profiler script `yarn speckit:profile` and report bottleneck in issue tracker.

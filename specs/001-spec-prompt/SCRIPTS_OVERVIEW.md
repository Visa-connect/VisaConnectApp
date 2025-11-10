# SpecKit Scripts Overview

**Date**: 2025-01-27  
**Purpose**: Explain the purpose and interaction of all SpecKit infrastructure scripts

## Overview

These scripts form the infrastructure for the **SpecKit** system - a tool that automates the creation of feature specifications, plans, and task lists for the VisaConnect project. They implement **Phase 0-2 tasks** (T004-T008, T036) focused on validation, logging, and security.

## Script Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SpecKit Workflow                          │
│  /speckit.specify → /speckit.clarify → /speckit.plan → ...  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │   create-new-feature.sh (Bash)       │
        │   - Orchestrates the workflow        │
        │   - Calls validation & logging       │
        └──────────────────────────────────────┘
                  │                    │
         ┌────────┴────────┐   ┌──────┴──────┐
         ▼                 ▼   ▼             ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Validation   │  │   Logging    │  │   Security   │
│  System      │  │   System     │  │   Scanning   │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Scripts by Category

### 1. Core Orchestration Script

#### `.specify/scripts/bash/create-new-feature.sh`

**Purpose**: Main entry point for creating new feature specifications

**What it does**:

- Parses command-line arguments (feature description, branch name, number)
- **Validates** the feature description using `promptValidation.ts`
- Generates branch names with smart filtering
- Creates feature directories and spec files
- **Logs** the execution using `logSpecKitCommand.ts`
- Sets up the `SPECIFY_FEATURE` environment variable

**Key Features**:

- Handles JSON output mode for programmatic access
- Validates branch names against GitHub restrictions
- Integrates validation and logging seamlessly
- Fails gracefully if validation fails

**Usage**:

```bash
.specify/scripts/bash/create-new-feature.sh "Add user authentication" --short-name "user-auth"
```

---

### 2. Validation System

#### `.specify/scripts/lib/promptValidation.ts`

**Purpose**: Validates feature descriptions and other inputs before processing

**What it validates**:

- ✅ **Feature descriptions**:
  - Minimum length (10 characters)
  - Maximum length (5000 characters)
  - Not empty or whitespace-only
  - Not placeholder text (TODO, TBD, etc.)
  - Not repeated characters (garbage input)
  - Valid character set
- ✅ **Branch names**:
  - GitHub naming restrictions
  - No spaces, control characters, or invalid sequences
  - Length validation
- ✅ **Feature numbers**:
  - 3-digit format (001, 042, etc.)
  - Not "000"

**Key Functions**:

- `validateFeatureDescription()` - Main validation function
- `validateBranchName()` - Branch name validation
- `validateFeatureNumber()` - Feature number validation
- `formatValidationErrors()` - Human-readable error messages

**Why it's important**:

- Prevents low-quality specifications from being created
- Catches errors early (before files are created)
- Provides actionable error messages
- Ensures consistency across the codebase

**Example Output**:

```
Validation Errors:
  1. Feature description must be at least 10 characters long
  2. Feature description appears to be placeholder text

Warnings:
  1. Feature description is quite short; consider providing more detail
```

---

#### `.specify/scripts/lib/validateAndLog.ts`

**Purpose**: Integration helper that combines validation and logging

**What it does**:

- Validates feature descriptions
- Logs validation results (success/failure)
- Provides exit codes for bash script integration

**Note**: This is a convenience wrapper that can be called from bash scripts or used as a standalone CLI tool.

---

### 3. Logging System

#### `.specify/scripts/lib/promptLogger.ts`

**Purpose**: Provides structured JSON logging for all SpecKit command executions

**What it logs**:

- ✅ **Command metadata**:
  - Command type (specify, clarify, plan, tasks, implement)
  - Timestamp (ISO 8601 format)
  - User/actor (from environment variables)
  - Branch name and feature number
- ✅ **Execution metrics**:
  - Duration (milliseconds)
  - Success/failure status
  - Error details (message, stack trace)
- ✅ **Custom metadata**:
  - Feature description
  - Spec file path
  - Any additional context

**Key Functions**:

- `logSuccess()` - Log successful command executions
- `logError()` - Log failed command executions
- `logStart()` - Returns a completion function for duration tracking
- `writeLogEntry()` - Low-level log entry writing
- `getCurrentUser()` - Detects user from environment (CI/local)

**Log Format**:

```json
{
  "timestamp": "2025-01-27T10:30:00.000Z",
  "command": "specify",
  "branch": "001-spec-prompt",
  "featureNum": "001",
  "user": "arron",
  "duration": 1234,
  "success": true,
  "metadata": {
    "featureDescription": "Create specification prompt generator",
    "specFile": "/path/to/spec.md"
  }
}
```

**Why it's important**:

- **Audit trail**: Track all SpecKit command executions
- **Debugging**: Identify issues with command execution
- **Analytics**: Monitor usage patterns and performance
- **Compliance**: Support governance and compliance reviews

---

#### `.specify/scripts/lib/logSpecKitCommand.ts`

**Purpose**: CLI wrapper for logging SpecKit commands from bash scripts

**What it does**:

- Accepts command-line arguments (command, branch, featureNum, duration, success, metadata)
- Parses JSON metadata
- Calls `promptLogger.ts` functions to write log entries
- Handles errors gracefully (doesn't break main workflow)

**Usage** (called from bash):

```bash
ts-node logSpecKitCommand.ts "specify" "001-spec-prompt" "001" "1234" "true" '{"featureDescription":"..."}' "/repo/root"
```

**Why it exists**:

- Bash scripts can't directly call TypeScript functions
- Provides a clean interface for bash → TypeScript communication
- Handles argument parsing and error handling

---

#### `.specify/scripts/lib/rotateLogs.ts`

**Purpose**: Manages log file rotation to prevent excessive disk usage

**What it does**:

- Archives current `speckit.log` to `speckit-YYYY-MM-DD.log`
- Creates a new empty `speckit.log` file
- Deletes logs older than 12 weeks (3 months)
- Handles edge cases (empty logs, existing archives)

**Key Features**:

- Automatic date-based archiving
- Configurable retention period (default: 12 weeks)
- Safe operation (doesn't delete current log if empty)
- Handles duplicate archive names with timestamps

**Usage**:

```bash
yarn speckit:logs:rotate
# or
ts-node .specify/scripts/lib/rotateLogs.ts
```

**Why it's important**:

- Prevents log files from growing indefinitely
- Maintains audit trail for compliance (3 months)
- Reduces disk usage
- Can be automated via cron or GitHub Actions

---

### 4. Security & Compliance

#### `.github/workflows/speckit-security.yml`

**Purpose**: Automated monthly security scanning for SpecKit dependencies

**What it does**:

- **Scheduled execution**: Runs on the 1st of each month
- **Manual trigger**: Can be triggered manually via `workflow_dispatch`
- **PR trigger**: Runs on PRs that modify SpecKit files
- **Security scanning**:
  - Runs `npm audit --production` for root dependencies
  - Runs `npm audit --production` for server dependencies
  - Optional Snyk integration (if `SNYK_TOKEN` is configured)
- **Reporting**:
  - Generates security reports in `specs/logs/security-check-YYYY-MM.md`
  - Uploads audit results as GitHub Actions artifacts
  - Comments on PRs with security findings
  - Fails the workflow on critical vulnerabilities

**Key Features**:

- Comprehensive security coverage (root + server dependencies)
- Automated reporting and artifact uploads
- PR integration (comments on security findings)
- Fail-fast on critical vulnerabilities
- 90-day artifact retention

**Why it's important**:

- **Constitution compliance**: "Dependency audit runs monthly and before releases"
- **Security**: Identifies vulnerabilities early
- **Compliance**: Supports security audit requirements
- **Automation**: Reduces manual security scanning effort

---

## How They Work Together

### Example Workflow: Creating a New Feature

1. **User runs**: `/speckit.specify "Add user authentication"`

2. **`create-new-feature.sh` starts**:

   - Parses arguments
   - Records start time for duration tracking

3. **Validation phase** (T005, T006):

   - Calls `promptValidation.ts` to validate feature description
   - If validation fails → exits with error message
   - If validation passes → continues

4. **Feature creation**:

   - Generates branch name
   - Creates feature directory
   - Creates spec file from template

5. **Logging phase** (T007, T008):

   - Calculates duration
   - Calls `logSpecKitCommand.ts` to log execution
   - `logSpecKitCommand.ts` calls `promptLogger.ts` to write log entry
   - Log entry written to `specs/logs/speckit.log`

6. **Completion**:
   - Returns branch name, spec file path, feature number
   - Sets `SPECIFY_FEATURE` environment variable

### Monthly Security Scan

1. **GitHub Actions triggers** (1st of each month):

   - `speckit-security.yml` workflow runs

2. **Security scanning**:

   - Runs `npm audit` for root and server dependencies
   - Optionally runs Snyk (if configured)

3. **Reporting**:
   - Generates security report
   - Uploads artifacts
   - Comments on PRs (if applicable)
   - Fails on critical vulnerabilities

### Log Rotation

1. **Weekly/Monthly** (manual or automated):

   - Run `yarn speckit:logs:rotate`

2. **Rotation process**:
   - Archives current `speckit.log` to `speckit-YYYY-MM-DD.log`
   - Creates new empty `speckit.log`
   - Deletes logs older than 12 weeks

---

## Benefits of This Architecture

### 1. **Separation of Concerns**

- Validation logic is separate from orchestration
- Logging is separate from business logic
- Security scanning is automated and independent

### 2. **Reusability**

- Validation functions can be used by other scripts
- Logging functions can be used by other SpecKit commands
- Security workflow can be extended for other projects

### 3. **Maintainability**

- Each script has a single, clear purpose
- TypeScript provides type safety
- Bash scripts handle orchestration (their strength)

### 4. **Testability**

- TypeScript functions can be unit tested
- Validation logic can be tested independently
- Logging can be tested with mock file system

### 5. **Observability**

- All SpecKit commands are logged
- Security scans are automated and reported
- Log rotation prevents disk space issues

### 6. **Compliance**

- Audit trail for all SpecKit command executions
- Security scanning meets constitution requirements
- Log retention supports compliance needs

---

## Constitution Compliance

These scripts implement **Principle 3 (Security Is Non-Negotiable)** and support **Principle 5 (Performance)**:

✅ **Input Validation**: All inputs are validated before processing  
✅ **Structured Logging**: All executions are logged for audit trails  
✅ **Security Scanning**: Monthly dependency audits (constitution requirement)  
✅ **Error Handling**: Graceful failure handling that doesn't break workflows  
✅ **Documentation**: Comprehensive documentation for all scripts

---

## Next Steps

1. **Extend to other SpecKit commands**: Add validation and logging to `/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`
2. **Add unit tests**: Test validation and logging functions
3. **Add integration tests**: Test the full workflow end-to-end
4. **Monitor usage**: Use logs to identify usage patterns and optimization opportunities
5. **Automate log rotation**: Set up cron job or GitHub Actions workflow for automatic log rotation

---

## Related Documentation

- **Tasks**: `specs/001-spec-prompt/tasks.md` (T004-T008, T036)
- **Implementation Summary**: `specs/001-spec-prompt/IMPLEMENTATION_SUMMARY.md`
- **Log Documentation**: `specs/logs/README.md`
- **Security Tasks Analysis**: `specs/001-spec-prompt/SECURITY_TASKS_ANALYSIS.md`
- **Constitution**: `.specify/memory/constitution.md`

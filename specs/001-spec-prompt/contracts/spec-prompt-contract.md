# Contract – Specification Prompt Generator

## Purpose
Define the canonical request/response contract for generating VisaConnect feature specifications via SpecKit automation.

## Input Schema (Prompt Request)
- `description` *(string, required)*: Trimmed natural-language feature request (≥10 chars).  
- `context` *(object, optional)*: Keyed constraints aligned with focus areas (e.g., `security`, `performance`).  
- `branch` *(string, required)*: Target git branch name.  
- `author` *(string, required)*: Git user/email invoking the command.  
- `timestamp` *(ISO 8601 string, auto)*: Time of invocation.  
- `constitutionVersion` *(string, required)*: e.g., `1.0.0`.

### Validation Rules
- Reject if `description` missing or <10 trimmed characters.  
- Reject if `context` contains unknown keys.  
- Reject if `branch` does not match `^[0-9]{3}-[a-z0-9-]+$`.

## Output Schema (Specification Artifact)
- `specPath` *(string)*: Absolute path to generated spec file.  
- `sections` *(array)*: Ordered section payloads.
  - `name` *(enum)*: `User Scenarios`, `Requirements`, `Success Criteria`, etc.  
  - `content` *(Markdown string)*.  
- `clarifications` *(array)*: Outstanding questions with option tables.  
- `qualityChecklist` *(object)*: Boolean flags + notes mirroring checklist template.  
- `logs` *(array)*: Metadata entries appended to audit log.

## Error Responses
- `400 INVALID_INPUT`: Description missing/too short.  
- `409 CONSTITUTION_MISMATCH`: Local constitution outdated; instruct user to pull latest.  
- `422 TEMPLATE_INCONSISTENT`: Template placeholders detected; prompt update required.  
- `500 INTERNAL_ERROR`: Unhandled exceptions (details logged with stack trace reference).

## Example
```json
{
  "description": "Improve chat reliability under network loss",
  "context": {"performance": "optimize reconnection"},
  "branch": "002-chat-resilience",
  "author": "arronlinton",
  "timestamp": "2025-11-09T15:32:00Z",
  "constitutionVersion": "1.0.0"
}
```

## Compliance Notes
- Responses must embed links to constitution sections when referencing mandates.  
- Logs are immutable; rotation handled via maintenance script.  
- Contract review occurs quarterly alongside constitution audit.

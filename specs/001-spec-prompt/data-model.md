# Data Model – Specification Prompt Generator

## Entities

### PromptInput
- **Description**: Raw feature description and metadata captured from `/speckit.specify` invocation.  
- **Attributes**:
  - `id` (UUID v4) – unique run identifier
  - `timestamp` (ISO string)
  - `author` (Git user/email)
  - `branch` (string)
  - `description` (string, required, trimmed)
  - `context` (optional map of constraints)
- **Validation**: Description must be ≥10 non-whitespace characters; context keys limited to known focus areas.
- **Relationships**: Generates one `SpecificationDocument`.

### SpecificationDocument
- **Description**: Structured Markdown output conforming to VisaConnect constitution.  
- **Attributes**:
  - `specId` (same as `PromptInput.id`)
  - `sections` (array of `SpecSection`)
  - `clarifications` (array of `ClarificationItem`)
  - `qualityChecklist` (`ChecklistStatus`)
  - `version` (constitution version reference)
- **Relationships**: Links to multiple `SpecSection` entries; references `ChecklistStatus` artifact.

### SpecSection
- **Description**: Individual section content (Overview, Technical Approach, etc.).  
- **Attributes**:
  - `name` (enum)
  - `priority` (optional for user stories)
  - `content` (Markdown string)
  - `metrics` (optional key-value pairs)
- **Relationships**: Part of `SpecificationDocument`.

### ClarificationItem
- **Description**: Outstanding question recorded during `/speckit.clarify`.  
- **Attributes**:
  - `question` (string)
  - `options` (array of option descriptors)
  - `recommendedOption` (enum or null)
  - `response` (string ≤5 words)
  - `implications` (Markdown bullet summary)
- **State**: `status` enum {`pending`, `answered`, `deferred`}.

### ChecklistStatus
- **Description**: State of quality checklist for the spec.  
- **Attributes**:
  - `contentQuality` (boolean)
  - `requirementCompleteness` (boolean)
  - `featureReadiness` (boolean)
  - `notes` (Markdown string)
  - `lastReviewed` (ISO string)
- **Relationships**: Linked from `SpecificationDocument`.

## Derived Relationships

- `PromptInput` → `SpecificationDocument` (1:1)
- `SpecificationDocument` → `ClarificationItem` (1:N)
- `SpecificationDocument` → `ChecklistStatus` (1:1)

## State Transitions

1. **Draft Created**: `PromptInput` validated → `SpecificationDocument` generated with placeholder clarifications (status `pending`).
2. **Clarified**: `/speckit.clarify` answers update `ClarificationItem.status` to `answered`; `SpecificationDocument` updated accordingly.
3. **Planned**: `/speckit.plan` produces plan artifacts; `ChecklistStatus` toggles to all true when validations pass.
4. **Tasked**: `/speckit.tasks` produces actionable backlog items referencing `SpecificationDocument` sections.

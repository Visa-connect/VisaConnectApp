# How to Run promptValidation.ts

## Overview

`promptValidation.ts` is a **library module** with exported functions. It doesn't have a direct CLI interface, but there are several ways to use it:

## Option 1: Use validateAndLog.ts (Recommended)

The `validateAndLog.ts` script provides a CLI interface that uses `promptValidation.ts`:

```bash
# From repository root
ts-node .specify/scripts/lib/validateAndLog.ts "Your feature description here"

# With custom repo root
ts-node .specify/scripts/lib/validateAndLog.ts "Your feature description here" "/path/to/repo"
```

**Example**:

```bash
ts-node .specify/scripts/lib/validateAndLog.ts "Add user authentication system"
```

**Output** (if valid):

```
✅ Validation passed
```

**Output** (if invalid):

```
Validation Errors:
  1. Feature description must be at least 10 characters long
  2. Feature description appears to be placeholder text
```

---

## Option 2: Use ts-node with Inline Code

You can call the validation functions directly using `ts-node` with inline code:

```bash
# Validate a feature description
ts-node -e "
import { validateFeatureDescription, formatValidationErrors } from './.specify/scripts/lib/promptValidation';
const result = validateFeatureDescription('Your feature description here');
if (!result.valid) {
  console.error(formatValidationErrors(result));
  process.exit(1);
} else {
  console.log('✅ Validation passed');
  if (result.warnings.length > 0) {
    console.warn('Warnings:', result.warnings);
  }
}
"
```

**Example**:

```bash
cd /Users/arronlinton/Desktop/MagistriDev/TheCreativeBomb/VisaConnect/VisaConnect
ts-node -e "
import { validateFeatureDescription, formatValidationErrors } from './.specify/scripts/lib/promptValidation';
const result = validateFeatureDescription('Add user authentication');
console.log('Valid:', result.valid);
console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);
"
```

---

## Option 3: Create a Simple Test Script

Create a test script to validate inputs:

**Create**: `.specify/scripts/lib/testValidation.ts`

```typescript
#!/usr/bin/env ts-node

import {
  validateFeatureDescription,
  validateBranchName,
  validateFeatureNumber,
  formatValidationErrors,
} from './promptValidation';

const args = process.argv.slice(2);
const command = args[0];
const input = args[1];

if (!command || !input) {
  console.error('Usage: ts-node testValidation.ts <command> <input>');
  console.error('Commands: description, branch, featureNum');
  process.exit(1);
}

let result;

switch (command) {
  case 'description':
    result = validateFeatureDescription(input);
    break;
  case 'branch':
    result = validateBranchName(input);
    break;
  case 'featureNum':
    result = validateFeatureNumber(input);
    break;
  default:
    console.error('Unknown command:', command);
    process.exit(1);
}

if (result.valid) {
  console.log('✅ Validation passed');
  if (result.warnings.length > 0) {
    console.warn('Warnings:');
    result.warnings.forEach((w) => console.warn('  -', w));
  }
} else {
  console.error(formatValidationErrors(result));
  process.exit(1);
}
```

**Usage**:

```bash
# Validate feature description
ts-node .specify/scripts/lib/testValidation.ts description "Add user authentication"

# Validate branch name
ts-node .specify/scripts/lib/testValidation.ts branch "001-user-auth"

# Validate feature number
ts-node .specify/scripts/lib/testValidation.ts featureNum "001"
```

---

## Option 4: Use in Node.js/TypeScript Code

Import and use the functions programmatically:

```typescript
import {
  validateFeatureDescription,
  formatValidationErrors,
} from './.specify/scripts/lib/promptValidation';

const result = validateFeatureDescription('Your feature description');

if (result.valid) {
  console.log('Valid!');
  if (result.warnings.length > 0) {
    console.warn('Warnings:', result.warnings);
  }
} else {
  console.error(formatValidationErrors(result));
}
```

---

## Option 5: Test Individual Functions

You can test individual validation functions:

### Test Feature Description Validation

```bash
ts-node -e "
import { validateFeatureDescription } from './.specify/scripts/lib/promptValidation';

// Test cases
const testCases = [
  '',  // Empty
  'TODO',  // Placeholder
  'Add',  // Too short
  'Add user authentication system with email verification and password reset functionality',  // Valid
  'A'.repeat(6000),  // Too long
];

testCases.forEach((desc, i) => {
  console.log(\`Test \${i + 1}: \"\${desc.substring(0, 50)}...\"\`);
  const result = validateFeatureDescription(desc);
  console.log('  Valid:', result.valid);
  console.log('  Errors:', result.errors);
  console.log('  Warnings:', result.warnings);
  console.log('');
});
"
```

### Test Branch Name Validation

```bash
ts-node -e "
import { validateBranchName } from './.specify/scripts/lib/promptValidation';

const testCases = [
  '001-user-auth',  // Valid
  'user auth',  // Has spaces
  '001-user-auth-',  // Ends with hyphen
  '001-user-auth-very-long-branch-name-that-exceeds-reasonable-length-limits',  // Too long
];

testCases.forEach((name, i) => {
  console.log(\`Test \${i + 1}: \"\${name}\"\`);
  const result = validateBranchName(name);
  console.log('  Valid:', result.valid);
  console.log('  Errors:', result.errors);
  console.log('');
});
"
```

### Test Feature Number Validation

```bash
ts-node -e "
import { validateFeatureNumber } from './.specify/scripts/lib/promptValidation';

const testCases = [
  '001',  // Valid
  '042',  // Valid
  '000',  // Invalid (cannot be 000)
  '12',  // Invalid (not 3 digits)
  '1234',  // Invalid (too many digits)
];

testCases.forEach((num, i) => {
  console.log(\`Test \${i + 1}: \"\${num}\"\`);
  const result = validateFeatureNumber(num);
  console.log('  Valid:', result.valid);
  console.log('  Errors:', result.errors);
  console.log('');
});
"
```

---

## Quick Reference

### Available Functions

- `validateFeatureDescription(description: string | null | undefined): ValidationResult`
- `validateBranchName(branchName: string | null | undefined): ValidationResult`
- `validateFeatureNumber(featureNum: string | null | undefined): ValidationResult`
- `formatValidationErrors(result: ValidationResult): string`

### ValidationResult Interface

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### Common Validation Rules

**Feature Description**:

- Minimum length: 10 characters
- Maximum length: 5000 characters
- Cannot be empty or whitespace-only
- Cannot be placeholder text (TODO, TBD, etc.)
- Cannot have excessive repeated characters

**Branch Name**:

- Cannot contain spaces
- Cannot start with `.` or end with `.` or `/`
- Cannot contain `..` or `@{`
- Cannot contain control characters
- Maximum length: 200 characters

**Feature Number**:

- Must be 3 digits (e.g., "001", "042")
- Cannot be "000"

---

## Integration with create-new-feature.sh

The `create-new-feature.sh` script automatically uses validation:

```bash
.specify/scripts/bash/create-new-feature.sh "Your feature description"
```

This will:

1. Validate the feature description
2. Exit with error if validation fails
3. Continue if validation passes
4. Log the validation result

---

## Troubleshooting

### Issue: "Cannot find module"

**Solution**: Make sure you're running from the repository root:

```bash
cd /Users/arronlinton/Desktop/MagistriDev/TheCreativeBomb/VisaConnect/VisaConnect
ts-node .specify/scripts/lib/validateAndLog.ts "Your description"
```

### Issue: "ts-node: command not found"

**Solution**: Install ts-node:

```bash
npm install -g ts-node
# or
yarn global add ts-node
```

### Issue: TypeScript compilation errors

**Solution**: Make sure TypeScript is configured. Check if `tsconfig.json` exists in the repo root.

---

## Examples

### Example 1: Validate a Good Description

```bash
ts-node .specify/scripts/lib/validateAndLog.ts "Add user authentication system with email verification and password reset functionality"
```

**Output**:

```
✅ Validation passed
```

### Example 2: Validate a Bad Description

```bash
ts-node .specify/scripts/lib/validateAndLog.ts "TODO"
```

**Output**:

```
Validation Errors:
  1. Feature description appears to be placeholder text; please provide a real feature description

❌ Validation failed
```

### Example 3: Validate with Warnings

```bash
ts-node .specify/scripts/lib/validateAndLog.ts "Add auth"
```

**Output**:

```
Validation Errors:
  1. Feature description must be at least 10 characters long

❌ Validation failed
```

---

## Next Steps

1. **Use validateAndLog.ts** for CLI usage (Option 1)
2. **Create test scripts** for automated testing (Option 3)
3. **Integrate into workflows** using the programmatic API (Option 4)
4. **Extend validation** by adding new validation rules to `promptValidation.ts`

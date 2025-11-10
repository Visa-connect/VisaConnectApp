/**
 * Prompt Input Validation Utility
 *
 * Validates feature descriptions and other prompt inputs for SpecKit commands.
 * Ensures inputs meet quality standards and provides actionable error messages.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a feature description for SpecKit commands
 *
 * @param description - The feature description to validate
 * @returns ValidationResult with validity status and any errors/warnings
 */
export function validateFeatureDescription(
  description: string | null | undefined
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if description is provided
  if (!description) {
    errors.push('Feature description is required');
    return { valid: false, errors, warnings };
  }

  // Trim whitespace
  const trimmed = description.trim();

  // Check if description is empty after trimming
  if (trimmed.length === 0) {
    errors.push('Feature description cannot be empty or whitespace-only');
    return { valid: false, errors, warnings };
  }

  // Check minimum length (at least 10 characters for meaningful description)
  if (trimmed.length < 10) {
    errors.push('Feature description must be at least 10 characters long');
  }

  // Check maximum length (reasonable limit to prevent abuse)
  const MAX_LENGTH = 5000;
  if (trimmed.length > MAX_LENGTH) {
    errors.push(
      `Feature description exceeds maximum length of ${MAX_LENGTH} characters`
    );
  }

  // Warn about very short descriptions (likely incomplete)
  if (trimmed.length < 50) {
    warnings.push(
      'Feature description is quite short; consider providing more detail for better spec generation'
    );
  }

  // Warn about very long descriptions (may need clarification)
  if (trimmed.length > 2000) {
    warnings.push(
      'Feature description is very long; consider breaking it into smaller features or using clarification'
    );
  }

  // Check for common placeholder text
  const placeholderPatterns = [
    /^TODO$/i,
    /^TBD$/i,
    /^\.\.\.$/,
    /^placeholder$/i,
    /^test$/i,
    /^example$/i,
    /^lorem ipsum/i,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(trimmed)) {
      errors.push(
        'Feature description appears to be placeholder text; please provide a real feature description'
      );
      break;
    }
  }

  // Check for repeated characters (likely garbage input)
  const repeatedCharPattern = /(.)\1{20,}/;
  if (repeatedCharPattern.test(trimmed)) {
    errors.push('Feature description contains excessive repeated characters');
  }

  // Check for valid characters (allow letters, numbers, punctuation, whitespace, common symbols)
  const validCharPattern = /^[\p{L}\p{N}\p{P}\p{Z}\p{S}]+$/u;
  if (!validCharPattern.test(trimmed)) {
    warnings.push(
      'Feature description contains unusual characters; ensure it is readable'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a branch name for SpecKit commands
 *
 * @param branchName - The branch name to validate
 * @returns ValidationResult with validity status and any errors/warnings
 */
export function validateBranchName(
  branchName: string | null | undefined
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!branchName) {
    errors.push('Branch name is required');
    return { valid: false, errors, warnings };
  }

  const trimmed = branchName.trim();

  if (trimmed.length === 0) {
    errors.push('Branch name cannot be empty');
    return { valid: false, errors, warnings };
  }

  // GitHub branch name restrictions
  // - Cannot contain spaces
  // - Cannot start with . or end with . or /
  // - Cannot contain sequences like .. or @{
  // - Cannot contain control characters
  // - Maximum 244 bytes (not characters, but we'll use a reasonable character limit)

  if (/\s/.test(trimmed)) {
    errors.push('Branch name cannot contain spaces');
  }

  if (
    trimmed.startsWith('.') ||
    trimmed.endsWith('.') ||
    trimmed.endsWith('/')
  ) {
    errors.push('Branch name cannot start with . or end with . or /');
  }

  if (trimmed.includes('..') || trimmed.includes('@{')) {
    errors.push('Branch name cannot contain .. or @{');
  }

  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    errors.push('Branch name cannot contain control characters');
  }

  // Check length (GitHub limit is 244 bytes, but we'll use a reasonable character limit)
  const MAX_LENGTH = 200;
  if (trimmed.length > MAX_LENGTH) {
    errors.push(
      `Branch name exceeds maximum length of ${MAX_LENGTH} characters`
    );
  }

  // Warn about very short branch names
  if (trimmed.length < 3) {
    warnings.push(
      'Branch name is very short; consider using a more descriptive name'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a feature number for SpecKit commands
 *
 * @param featureNum - The feature number to validate (e.g., "001")
 * @returns ValidationResult with validity status and any errors/warnings
 */
export function validateFeatureNumber(
  featureNum: string | null | undefined
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!featureNum) {
    errors.push('Feature number is required');
    return { valid: false, errors, warnings };
  }

  const trimmed = featureNum.trim();

  if (trimmed.length === 0) {
    errors.push('Feature number cannot be empty');
    return { valid: false, errors, warnings };
  }

  // Feature number should be a zero-padded 3-digit number (e.g., "001", "042")
  const featureNumPattern = /^\d{3}$/;
  if (!featureNumPattern.test(trimmed)) {
    errors.push('Feature number must be a 3-digit number (e.g., "001", "042")');
  }

  // Check that it's not "000"
  if (trimmed === '000') {
    errors.push('Feature number cannot be "000"');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Formats validation errors and warnings into a human-readable message
 *
 * @param result - The validation result to format
 * @returns Formatted error message
 */
export function formatValidationErrors(result: ValidationResult): string {
  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push('Validation Errors:');
    result.errors.forEach((error, index) => {
      parts.push(`  ${index + 1}. ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    parts.push('\nWarnings:');
    result.warnings.forEach((warning, index) => {
      parts.push(`  ${index + 1}. ${warning}`);
    });
  }

  return parts.join('\n');
}

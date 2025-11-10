/**
 * Validation and Logging Integration Helper
 * 
 * Provides a Node.js script that can be called from bash scripts to validate inputs
 * and log SpecKit command executions.
 */

import { validateFeatureDescription, formatValidationErrors, ValidationResult } from './promptValidation';
import { logStart, logSuccess, logError } from './promptLogger';

/**
 * Validates a feature description and logs the result
 * 
 * @param description - The feature description to validate
 * @param repoRoot - The repository root directory
 * @returns Exit code (0 for success, 1 for failure)
 */
export function validateFeatureDescriptionAndLog(
  description: string | null | undefined,
  repoRoot: string = process.cwd()
): number {
  const logComplete = logStart('specify', { metadata: { action: 'validate' } }, repoRoot);
  
  try {
    const result = validateFeatureDescription(description);
    
    if (result.valid) {
      // Log warnings if any
      if (result.warnings.length > 0) {
        console.warn('Validation warnings:');
        result.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }
      
      logComplete(true, undefined, { validationResult: 'passed', warnings: result.warnings.length });
      return 0;
    } else {
      const errorMessage = formatValidationErrors(result);
      console.error(errorMessage);
      
      const error = new Error('Feature description validation failed');
      logComplete(false, error, { validationResult: 'failed', errors: result.errors });
      return 1;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logComplete(false, err);
    return 1;
  }
}

/**
 * Main entry point for CLI usage
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node validateAndLog.js <feature_description> [repo_root]');
    process.exit(1);
  }
  
  const description = args[0];
  const repoRoot = args[1] || process.cwd();
  
  const exitCode = validateFeatureDescriptionAndLog(description, repoRoot);
  process.exit(exitCode);
}


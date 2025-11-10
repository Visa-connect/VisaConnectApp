#!/usr/bin/env ts-node

/**
 * CLI script to log SpecKit command executions
 *
 * This script can be called from bash scripts to log command executions.
 * Usage: ts-node logSpecKitCommand.ts <command> <branch> <featureNum> <duration> <success> [metadata_json]
 */

import { logSuccess, logError } from './promptLogger';

const args = process.argv.slice(2);

if (args.length < 5) {
  console.error(
    'Usage: ts-node logSpecKitCommand.ts <command> <branch> <featureNum> <duration> <success> [metadata_json] [repoRoot]'
  );
  process.exit(1);
}

const [
  command,
  branch,
  featureNum,
  durationStr,
  successStr,
  metadataJson,
  repoRoot,
] = args;

const commandType = command as
  | 'specify'
  | 'clarify'
  | 'plan'
  | 'tasks'
  | 'implement';
const duration = parseInt(durationStr, 10);
const success = successStr === 'true';

let metadata: Record<string, unknown> = {};
if (metadataJson) {
  try {
    metadata = JSON.parse(metadataJson);
  } catch (error) {
    console.warn('Failed to parse metadata JSON, using empty object');
  }
}

const options = {
  branch: branch || undefined,
  featureNum: featureNum || undefined,
  duration,
  metadata,
};

try {
  if (success) {
    logSuccess(commandType, options, repoRoot || process.cwd());
  } else {
    logError(
      commandType,
      new Error('Command execution failed'),
      options,
      repoRoot || process.cwd()
    );
  }
} catch (error) {
  // Fail silently if logging fails (don't break the main workflow)
  // Only log errors in development mode
  if (process.env.NODE_ENV === 'development') {
    console.error('Failed to log SpecKit command:', error);
  }
  // Exit successfully to not break the main script
  process.exit(0);
}

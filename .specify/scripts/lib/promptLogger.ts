/**
 * JSON Logging Helper for SpecKit Commands
 * 
 * Provides structured JSON logging for SpecKit command executions.
 * Logs are written to specs/logs/speckit.log in JSON format for easy parsing.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  command: 'specify' | 'clarify' | 'plan' | 'tasks' | 'implement';
  branch?: string;
  featureNum?: string;
  user?: string;
  duration?: number;
  success: boolean;
  metadata?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Gets the path to the SpecKit log file
 * 
 * @param repoRoot - The repository root directory
 * @returns Path to the log file
 */
export function getLogFilePath(repoRoot: string): string {
  const logsDir = path.join(repoRoot, 'specs', 'logs');
  
  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  return path.join(logsDir, 'speckit.log');
}

/**
 * Gets the current user (for logging purposes)
 * 
 * @returns Current user identifier
 */
export function getCurrentUser(): string {
  // Try to get user from environment variables (common in CI)
  const user = process.env.USER || 
               process.env.USERNAME || 
               process.env.GIT_AUTHOR_NAME ||
               process.env.GITHUB_ACTOR ||
               'unknown';
  
  return user;
}

/**
 * Writes a log entry to the SpecKit log file
 * 
 * @param entry - The log entry to write
 * @param repoRoot - The repository root directory (defaults to current working directory)
 */
export function writeLogEntry(entry: LogEntry, repoRoot: string = process.cwd()): void {
  try {
    const logFilePath = getLogFilePath(repoRoot);
    
    // Ensure user is set if not provided
    if (!entry.user) {
      entry.user = getCurrentUser();
    }
    
    // Ensure timestamp is set if not provided
    if (!entry.timestamp) {
      entry.timestamp = new Date().toISOString();
    }
    
    // Convert entry to JSON and append to log file
    const logLine = JSON.stringify(entry) + '\n';
    
    // Append to log file (create if it doesn't exist)
    fs.appendFileSync(logFilePath, logLine, { encoding: 'utf-8' });
  } catch (error) {
    // Fail silently if logging fails (don't break the main workflow)
    // But log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to write log entry:', error);
    }
  }
}

/**
 * Creates a log entry for a SpecKit command execution
 * 
 * @param command - The command that was executed
 * @param options - Additional options for the log entry
 * @returns The log entry
 */
export function createLogEntry(
  command: LogEntry['command'],
  options: {
    branch?: string;
    featureNum?: string;
    user?: string;
    duration?: number;
    success: boolean;
    metadata?: Record<string, unknown>;
    error?: Error;
  }
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    command,
    success: options.success,
  };
  
  if (options.branch) {
    entry.branch = options.branch;
  }
  
  if (options.featureNum) {
    entry.featureNum = options.featureNum;
  }
  
  if (options.user) {
    entry.user = options.user;
  } else {
    entry.user = getCurrentUser();
  }
  
  if (options.duration !== undefined) {
    entry.duration = options.duration;
  }
  
  if (options.metadata) {
    entry.metadata = options.metadata;
  }
  
  if (options.error) {
    entry.error = {
      message: options.error.message,
      stack: options.error.stack,
    };
  }
  
  return entry;
}

/**
 * Logs a successful SpecKit command execution
 * 
 * @param command - The command that was executed
 * @param options - Additional options for the log entry
 * @param repoRoot - The repository root directory
 */
export function logSuccess(
  command: LogEntry['command'],
  options: {
    branch?: string;
    featureNum?: string;
    user?: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  },
  repoRoot: string = process.cwd()
): void {
  const entry = createLogEntry(command, {
    ...options,
    success: true,
  });
  
  writeLogEntry(entry, repoRoot);
}

/**
 * Logs a failed SpecKit command execution
 * 
 * @param command - The command that was executed
 * @param error - The error that occurred
 * @param options - Additional options for the log entry
 * @param repoRoot - The repository root directory
 */
export function logError(
  command: LogEntry['command'],
  error: Error,
  options: {
    branch?: string;
    featureNum?: string;
    user?: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  } = {},
  repoRoot: string = process.cwd()
): void {
  const entry = createLogEntry(command, {
    ...options,
    success: false,
    error,
  });
  
  writeLogEntry(entry, repoRoot);
}

/**
 * Logs the start of a SpecKit command execution
 * 
 * @param command - The command that is being executed
 * @param options - Additional options for the log entry
 * @param repoRoot - The repository root directory
 * @returns A function to call when the command completes (for duration tracking)
 */
export function logStart(
  command: LogEntry['command'],
  options: {
    branch?: string;
    featureNum?: string;
    user?: string;
    metadata?: Record<string, unknown>;
  } = {},
  repoRoot: string = process.cwd()
): (success: boolean, error?: Error, additionalMetadata?: Record<string, unknown>) => void {
  const startTime = Date.now();
  
  return (success: boolean, error?: Error, additionalMetadata?: Record<string, unknown>) => {
    const duration = Date.now() - startTime;
    const metadata = {
      ...options.metadata,
      ...additionalMetadata,
    };
    
    if (success) {
      logSuccess(command, {
        ...options,
        duration,
        metadata,
      }, repoRoot);
    } else {
      logError(command, error || new Error('Unknown error'), {
        ...options,
        duration,
        metadata,
      }, repoRoot);
    }
  };
}


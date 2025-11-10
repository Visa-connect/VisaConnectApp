#!/usr/bin/env ts-node

/**
 * Log Rotation Script for SpecKit Logs
 * 
 * Rotates the SpecKit execution log file by archiving the current log
 * and creating a new empty log file. Keeps the last 12 weeks of logs.
 * 
 * Usage: ts-node rotateLogs.ts [logsDir] [maxWeeks]
 */

import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE_NAME = 'speckit.log';
const MAX_WEEKS = 12; // Keep logs for 12 weeks (3 months)

function rotateLogs(logsDir: string = path.join(process.cwd(), 'specs', 'logs'), maxWeeks: number = MAX_WEEKS): void {
  const logFilePath = path.join(logsDir, LOG_FILE_NAME);
  
  // Check if log file exists
  if (!fs.existsSync(logFilePath)) {
    console.log('No log file found. Nothing to rotate.');
    return;
  }
  
  // Get file stats
  const stats = fs.statSync(logFilePath);
  const fileSize = stats.size;
  
  // If file is empty, skip rotation
  if (fileSize === 0) {
    console.log('Log file is empty. Nothing to rotate.');
    return;
  }
  
  // Generate archive filename with current date
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const archiveFileName = `speckit-${dateStr}.log`;
  const archiveFilePath = path.join(logsDir, archiveFileName);
  
  // Check if archive file already exists (unlikely, but handle it)
  if (fs.existsSync(archiveFilePath)) {
    console.warn(`Archive file ${archiveFileName} already exists. Appending timestamp.`);
    const timestamp = now.getTime();
    const archiveFileNameWithTimestamp = `speckit-${dateStr}-${timestamp}.log`;
    const archiveFilePathWithTimestamp = path.join(logsDir, archiveFileNameWithTimestamp);
    fs.renameSync(logFilePath, archiveFilePathWithTimestamp);
    console.log(`Rotated log to ${archiveFileNameWithTimestamp}`);
  } else {
    // Rename current log to archive
    fs.renameSync(logFilePath, archiveFilePath);
    console.log(`Rotated log to ${archiveFileName}`);
  }
  
  // Create new empty log file
  fs.writeFileSync(logFilePath, '', { encoding: 'utf-8' });
  console.log(`Created new log file: ${LOG_FILE_NAME}`);
  
  // Clean up old logs (older than maxWeeks)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (maxWeeks * 7));
  
  const files = fs.readdirSync(logsDir);
  let deletedCount = 0;
  
  for (const file of files) {
    if (file.startsWith('speckit-') && file.endsWith('.log') && file !== LOG_FILE_NAME) {
      const filePath = path.join(logsDir, file);
      const fileStats = fs.statSync(filePath);
      const fileDate = new Date(fileStats.mtime);
      
      if (fileDate < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`Deleted old log: ${file}`);
      }
    }
  }
  
  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} old log file(s).`);
  } else {
    console.log('No old logs to clean up.');
  }
  
  console.log('Log rotation complete.');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const logsDir = args[0] || path.join(process.cwd(), 'specs', 'logs');
  const maxWeeks = args[1] ? parseInt(args[1], 10) : MAX_WEEKS;
  
  try {
    rotateLogs(logsDir, maxWeeks);
  } catch (error) {
    console.error('Error rotating logs:', error);
    process.exit(1);
  }
}

export { rotateLogs };


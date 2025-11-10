#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { platform } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

type ProfileIteration = {
  durationMs: number;
  peakRssBytes: number;
  userCpuMicros: number;
  systemCpuMicros: number;
  exitCode: number | null;
};

type ProfileSummary = {
  label: string;
  script: string;
  iterations: number;
  startedAt: string;
  completedAt: string;
  cwd: string;
  durationsMs: number[];
  averageDurationMs: number;
  maxDurationMs: number;
  minDurationMs: number;
  peakRssBytes: number;
  results: ProfileIteration[];
};

type CliOptions = {
  script: string | null;
  iterations: number;
  label: string;
  outputPath: string | null;
  dryRun: boolean;
};

const REPO_ROOT = path.resolve(__dirname, '../../..');
const DEFAULT_OUTPUT = path.join(
  REPO_ROOT,
  'specs',
  'logs',
  'profile-specprompt.json'
);

function parseCliOptions(): CliOptions {
  const args = process.argv.slice(2);
  let script: string | null = null;
  let iterations = 1;
  let label = 'specprompt-profile';
  let outputPath: string | null = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];

    switch (current) {
      case '--script':
        script = args[i + 1] ?? null;
        i += 1;
        break;
      case '--iterations':
        const parsed = parseInt(args[i + 1] ?? '1', 10);
        iterations = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
        i += 1;
        break;
      case '--label':
        label = args[i + 1] ?? label;
        i += 1;
        break;
      case '--output':
        outputPath = args[i + 1] ?? null;
        i += 1;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        break;
    }
  }

  return { script, iterations, label, outputPath, dryRun };
}

function printUsage(): void {
  const helpMessage = `\nPrompt Profiling Scaffold\n==========================\n
Usage:
  npx tsx .specify/scripts/analysis/profile-specprompt.ts --script "COMMAND" [options]

Required:
  --script       Shell command to exercise (example: "./.specify/scripts/bash/create-new-feature.sh --dry-run ...")

Optional:
  --iterations   Number of runs to measure (default: 1)
  --label        Label recorded in the summary (default: specprompt-profile)
  --output       Destination JSON file (default: ${DEFAULT_OUTPUT})
  --dry-run      Print the resolved command without executing it
  --help, -h     Show this help text

The script captures elapsed time, CPU usage, and peak RSS for the child process
using /usr/bin/time (Linux/macOS). Falls back to wall-clock time if time utility
is unavailable.\n`;

  // eslint-disable-next-line no-console
  console.log(helpMessage);
}

function ensureOutputDirectory(filePath: string): void {
  const directory = path.dirname(filePath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

function detectTimeUtility(): {
  available: boolean;
  command: string;
  flag: string;
} {
  const osPlatform = platform();
  const timeCmd = '/usr/bin/time';

  // Check if time utility exists by trying to run it
  const checkResult = spawnSync(timeCmd, ['--version'], {
    stdio: 'pipe',
    timeout: 1000,
  });
  const available = checkResult.status === 0 || checkResult.status === null;

  if (!available) {
    return { available: false, command: '', flag: '' };
  }

  // Linux uses -v, macOS uses -l
  const flag = osPlatform === 'darwin' ? '-l' : '-v';
  return { available, command: timeCmd, flag };
}

function parseTimeOutput(
  stderr: string,
  flag: string
): {
  durationMs: number;
  peakRssBytes: number;
  userCpuMicros: number;
  systemCpuMicros: number;
} {
  const result = {
    durationMs: 0,
    peakRssBytes: 0,
    userCpuMicros: 0,
    systemCpuMicros: 0,
  };

  if (flag === '-v') {
    // Linux format: "Maximum resident set size (kbytes): 12345"
    const maxRssMatch = stderr.match(
      /Maximum resident set size \(kbytes\):\s*(\d+)/
    );
    if (maxRssMatch) {
      result.peakRssBytes = parseInt(maxRssMatch[1], 10) * 1024; // Convert KB to bytes
    }

    // "User time (seconds): 1.23"
    const userTimeMatch = stderr.match(/User time \(seconds\):\s*([\d.]+)/);
    if (userTimeMatch) {
      result.userCpuMicros = Math.round(
        parseFloat(userTimeMatch[1]) * 1_000_000
      );
    }

    // "System time (seconds): 0.45"
    const systemTimeMatch = stderr.match(/System time \(seconds\):\s*([\d.]+)/);
    if (systemTimeMatch) {
      result.systemCpuMicros = Math.round(
        parseFloat(systemTimeMatch[1]) * 1_000_000
      );
    }

    // "Elapsed (wall clock) time (h:mm:ss or m:ss): 0:01.23" or "1:23:45.67"
    const elapsedMatch = stderr.match(
      /Elapsed \(wall clock\) time \(h:mm:ss or m:ss\):\s*(\d+):(\d+):([\d.]+)/
    );
    if (elapsedMatch) {
      // Format: h:mm:ss
      const hours = parseInt(elapsedMatch[1], 10);
      const minutes = parseInt(elapsedMatch[2], 10);
      const seconds = parseFloat(elapsedMatch[3]);
      result.durationMs = Math.round(
        (hours * 3600 + minutes * 60 + seconds) * 1000
      );
    } else {
      const elapsedMatchShort = stderr.match(
        /Elapsed \(wall clock\) time \(h:mm:ss or m:ss\):\s*(\d+):([\d.]+)/
      );
      if (elapsedMatchShort) {
        // Format: m:ss
        const minutes = parseInt(elapsedMatchShort[1], 10);
        const seconds = parseFloat(elapsedMatchShort[2]);
        result.durationMs = Math.round((minutes * 60 + seconds) * 1000);
      }
    }
  } else if (flag === '-l') {
    // macOS format: "        1.23 real         0.45 user         0.12 sys"
    const timeMatch = stderr.match(
      /([\d.]+)\s+real\s+([\d.]+)\s+user\s+([\d.]+)\s+sys/
    );
    if (timeMatch) {
      result.durationMs = Math.round(parseFloat(timeMatch[1]) * 1000);
      result.userCpuMicros = Math.round(parseFloat(timeMatch[2]) * 1_000_000);
      result.systemCpuMicros = Math.round(parseFloat(timeMatch[3]) * 1_000_000);
    }

    // "   12345678  maximum resident set size"
    const maxRssMatch = stderr.match(/(\d+)\s+maximum resident set size/);
    if (maxRssMatch) {
      result.peakRssBytes = parseInt(maxRssMatch[1], 10);
    }
  }

  return result;
}

function recordProfile(
  script: string,
  iterations: number,
  dryRun: boolean
): { results: ProfileIteration[]; startedAt: Date } {
  const results: ProfileIteration[] = [];
  const timeUtil = detectTimeUtility();
  const useTime = timeUtil.available && !dryRun;
  const startedAt = new Date(); // Capture actual start time before first iteration

  if (!useTime && !dryRun) {
    // eslint-disable-next-line no-console
    console.warn(
      'Warning: /usr/bin/time not available. Falling back to wall-clock time only.'
    );
  }

  for (let i = 0; i < iterations; i += 1) {
    if (dryRun) {
      // eslint-disable-next-line no-console
      console.log(`[dry-run] Iteration ${i + 1}: would execute -> ${script}`);
      results.push({
        durationMs: 0,
        peakRssBytes: 0,
        userCpuMicros: 0,
        systemCpuMicros: 0,
        exitCode: 0,
      });
      continue;
    }

    const start = performance.now();
    let child;
    let metrics = {
      durationMs: 0,
      peakRssBytes: 0,
      userCpuMicros: 0,
      systemCpuMicros: 0,
    };

    if (useTime) {
      // Wrap command with time utility to measure child process
      // Use bash -lc to match original behavior (login shell with command execution)
      child = spawnSync(
        timeUtil.command,
        [timeUtil.flag, 'bash', '-lc', script],
        {
          cwd: REPO_ROOT,
          stdio: 'pipe',
          env: {
            ...process.env,
            SPECKIT_PROFILE: 'true',
          },
        }
      );

      // Forward stdout to console
      if (child.stdout) {
        process.stdout.write(child.stdout);
      }

      // Parse time metrics from stderr (time outputs to stderr)
      if (child.stderr) {
        const stderrStr = child.stderr.toString('utf8');
        // Forward stderr to console (includes time output)
        process.stderr.write(child.stderr);

        // Extract metrics from time output
        metrics = parseTimeOutput(stderrStr, timeUtil.flag);
      }

      // Fallback to wall-clock time if parsing failed
      if (metrics.durationMs === 0) {
        metrics.durationMs = performance.now() - start;
      }
    } else {
      // Fallback: measure wall-clock time only
      child = spawnSync('bash', ['-lc', script], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env: {
          ...process.env,
          SPECKIT_PROFILE: 'true',
        },
      });
      metrics.durationMs = performance.now() - start;
    }

    results.push({
      durationMs: metrics.durationMs,
      peakRssBytes: metrics.peakRssBytes,
      userCpuMicros: metrics.userCpuMicros,
      systemCpuMicros: metrics.systemCpuMicros,
      exitCode: child.status,
    });

    if (child.error) {
      // eslint-disable-next-line no-console
      console.error(
        `Profiling iteration ${i + 1} failed:`,
        child.error.message
      );
      break;
    }

    if (child.status !== 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `Profiling iteration ${i + 1} exited with code ${
          child.status
        }. Stopping early.`
      );
      break;
    }
  }

  return { results, startedAt };
}

function buildSummary(
  options: CliOptions,
  results: ProfileIteration[],
  startedAt: Date
): ProfileSummary {
  const durations = results.map((entry) => entry.durationMs);
  const peakRss = results.reduce(
    (max, entry) => Math.max(max, entry.peakRssBytes),
    0
  );
  const completedAt = new Date();

  return {
    label: options.label,
    script: options.script ?? 'not-provided',
    iterations: results.length,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    cwd: REPO_ROOT,
    durationsMs: durations,
    averageDurationMs:
      durations.length > 0
        ? durations.reduce((acc, value) => acc + value, 0) / durations.length
        : 0,
    maxDurationMs: durations.length > 0 ? Math.max(...durations) : 0,
    minDurationMs: durations.length > 0 ? Math.min(...durations) : 0,
    peakRssBytes: peakRss,
    results,
  };
}

function writeSummary(summary: ProfileSummary, filePath: string | null): void {
  if (!filePath) {
    // eslint-disable-next-line no-console
    console.log('Profile summary (no output file specified):');
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  ensureOutputDirectory(filePath);
  writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Profile summary written to ${filePath}`);
}

function main(): void {
  const options = parseCliOptions();

  if (!options.script) {
    printUsage();
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(`Profiling command: ${options.script}`);
  // eslint-disable-next-line no-console
  console.log(`Iterations: ${options.iterations}`);
  // eslint-disable-next-line no-console
  console.log(`Working directory: ${REPO_ROOT}`);

  const { results, startedAt } = recordProfile(
    options.script,
    options.iterations,
    options.dryRun
  );
  const summary = buildSummary(options, results, startedAt);
  const destination = options.outputPath ?? DEFAULT_OUTPUT;
  writeSummary(summary, options.dryRun ? null : destination);
}

main();

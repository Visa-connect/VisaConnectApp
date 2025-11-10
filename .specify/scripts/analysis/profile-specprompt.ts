#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
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
        iterations = Math.max(1, parseInt(args[i + 1] ?? '1', 10));
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

The script captures elapsed time, CPU usage, and peak RSS for each run.\n`;

  // eslint-disable-next-line no-console
  console.log(helpMessage);
}

function ensureOutputDirectory(filePath: string): void {
  const directory = path.dirname(filePath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

function recordProfile(
  script: string,
  iterations: number,
  dryRun: boolean
): ProfileIteration[] {
  const results: ProfileIteration[] = [];

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

    const startCpu = process.cpuUsage();
    const startRss = process.memoryUsage().rss;
    const start = performance.now();
    const child = spawnSync('bash', ['-lc', script], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        SPECKIT_PROFILE: 'true',
      },
    });
    const durationMs = performance.now() - start;
    const cpuUsage = process.cpuUsage(startCpu);
    const endRss = process.memoryUsage().rss;

    results.push({
      durationMs,
      peakRssBytes: Math.max(startRss, endRss),
      userCpuMicros: cpuUsage.user,
      systemCpuMicros: cpuUsage.system,
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

  return results;
}

function buildSummary(
  options: CliOptions,
  results: ProfileIteration[]
): ProfileSummary {
  const durations = results.map((entry) => entry.durationMs);
  const peakRss = results.reduce(
    (max, entry) => Math.max(max, entry.peakRssBytes),
    0
  );
  const completedAt = new Date();
  const startedAt = new Date(
    completedAt.getTime() - durations.reduce((acc, value) => acc + value, 0)
  );

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

  const results = recordProfile(
    options.script,
    options.iterations,
    options.dryRun
  );
  const summary = buildSummary(options, results);
  const destination = options.outputPath ?? DEFAULT_OUTPUT;
  writeSummary(summary, options.dryRun ? null : destination);
}

main();

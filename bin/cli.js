#!/usr/bin/env node
/* eslint no-console: 0 */
import Fs from 'node:fs';
import Path from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

import Unnecessary from '../lib/index.js';
import { formatReport, loadOptions } from '../lib/report.js';

const { options, command } = parseArgs(process.argv.slice(2));

if (!command.length) {
  usage();
  process.exitCode = 1;
} else {
  run();
}

function run() {
  const config = loadOptions(options.cwd);
  const coverage = coverageDirectory(config);

  const env = { ...process.env, NODE_V8_COVERAGE: coverage.dir };
  env.PATH = [Path.join(process.cwd(), 'node_modules', '.bin'), env.PATH].filter(Boolean).join(Path.delimiter);

  const child = spawn(command[0], command.slice(1), {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  });

  child.on('error', (err) => {
    console.error('unnecessary: failed to run %s: %s', command[0], err.message);
    cleanup();
    process.exitCode = 1;
  });

  child.on('exit', async (code, signal) => {
    try {
      await report(coverage.dir, mergeOptions(config, options, coverage.dir));
    } finally {
      cleanup();
    }
    process.exitCode = signal ? 1 : code;
  });

  function cleanup() {
    if (coverage.temporary) Fs.rmSync(coverage.dir, { recursive: true, force: true });
  }
}

async function report(coverageDir, unnecessaryOptions) {
  process.env.NODE_V8_COVERAGE = coverageDir;
  const unnecessary = new Unnecessary(unnecessaryOptions);
  await unnecessary.ready;
  const untouched = unnecessary.untouched().map((file) => displayPath(unnecessary.options.cwd, file));
  if (!untouched.length) {
    console.log('\x1b[32mNo potentially unused files found\x1b[0m');
    return;
  }
  console.log(formatReport(untouched));
}

function coverageDirectory(config) {
  if (options.coverageDir) return keptCoverageDirectory(Path.resolve(options.coverageDir));
  if (process.env.NODE_V8_COVERAGE) return { dir: Path.resolve(process.env.NODE_V8_COVERAGE) };
  if (config?.coverageDir) return keptCoverageDirectory(Path.resolve(options.cwd ?? '.', config.coverageDir));
  return { dir: Fs.mkdtempSync(Path.join(tmpdir(), 'unnecessary-')), temporary: true };
}

function keptCoverageDirectory(dir) {
  Fs.mkdirSync(dir, { recursive: true });
  // reports left by a previous run would count as touched
  for (const name of Fs.readdirSync(dir)) {
    if (/^coverage-\d+-\d+-\d+\.json$/.test(name)) Fs.rmSync(Path.join(dir, name), { force: true });
  }
  return { dir };
}

function mergeOptions(config = {}, args, coverageDir) {
  const cwd = args.cwd || config.cwd || process.cwd();
  return {
    ...config,
    cwd,
    excludeDirs: [].concat(config.excludeDirs ?? [], args.excludeDirs, projectRelative(cwd, coverageDir)),
    excludeFiles: [].concat(config.excludeFiles ?? [], args.excludeFiles),
  };
}

function projectRelative(cwd, dir) {
  let relative;
  try {
    relative = Path.relative(Fs.realpathSync(cwd), Fs.realpathSync(dir));
  } catch {
    return [];
  }
  return !relative || relative.startsWith('..') || Path.isAbsolute(relative) ? [] : [relative];
}

function displayPath(cwd, file) {
  if (Path.resolve(cwd) === process.cwd()) return file;
  // untouched files are relative to the configured cwd - rebase them on the
  // invoking directory so they can be cmd+clicked open in the terminal
  const resolved = Path.resolve(cwd, file);
  const relative = Path.relative(process.cwd(), resolved);
  return relative.startsWith('..') ? resolved : relative.split(Path.sep).join('/');
}

function parseArgs(argv) {
  const parsed = { excludeDirs: [], excludeFiles: [] };
  let i = 0;
  for (; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') {
      i++;
      break;
    } else if (arg === '--exclude-dir') {
      parsed.excludeDirs.push(argv[++i]);
    } else if (arg === '--exclude-file') {
      parsed.excludeFiles.push(argv[++i]);
    } else if (arg === '--cwd') {
      parsed.cwd = argv[++i];
    } else if (arg === '--coverage-dir') {
      parsed.coverageDir = argv[++i];
    } else {
      break;
    }
  }
  return { options: parsed, command: argv.slice(i) };
}

function usage() {
  console.error(
    'Usage: unnecessary [--exclude-dir <dir>]... [--exclude-file <file>]... [--cwd <dir>] [--coverage-dir <dir>] [--] <command> [args...]',
  );
  console.error('');
  console.error('Runs <command> with NODE_V8_COVERAGE enabled and reports project files');
  console.error('that were never required or imported, e.g.: unnecessary mocha');
  console.error('');
  console.error('Options are read from the unnecessary field in package.json, arguments add to them.');
}

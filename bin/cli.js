#!/usr/bin/env node
/* eslint no-console: 0 */
import Fs from 'node:fs';
import Path from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

import Unnecessary from '../index.js';

const { options, command } = parseArgs(process.argv.slice(2));

if (!command.length) {
  usage();
  process.exitCode = 1;
} else {
  run();
}

function run() {
  const inheritedDir = process.env.NODE_V8_COVERAGE;
  const coverageDir = inheritedDir ? Path.resolve(inheritedDir) : Fs.mkdtempSync(Path.join(tmpdir(), 'unnecessary-'));

  const env = { ...process.env, NODE_V8_COVERAGE: coverageDir };
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
      await report(coverageDir);
    } finally {
      cleanup();
    }
    process.exitCode = signal ? 1 : code;
  });

  function cleanup() {
    if (!inheritedDir) Fs.rmSync(coverageDir, { recursive: true, force: true });
  }
}

async function report(coverageDir) {
  process.env.NODE_V8_COVERAGE = coverageDir;
  const unnecessary = new Unnecessary(options);
  await unnecessary.ready;
  const untouched = unnecessary.untouched().map((file) => displayPath(unnecessary.options.cwd, file));
  if (!untouched.length) {
    console.log('\x1b[32mNo potentially unused files found\x1b[0m');
    return;
  }
  console.log('\x1b[31mFound %d potentially unused file%s:\x1b[0m', untouched.length, untouched.length > 1 ? 's' : '');
  untouched.forEach((file) => {
    console.log('\x1b[33m  %s\x1b[0m', file);
  });
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
    } else {
      break;
    }
  }
  return { options: parsed, command: argv.slice(i) };
}

function usage() {
  console.error('Usage: unnecessary [--exclude-dir <dir>]... [--exclude-file <file>]... [--cwd <dir>] [--] <command> [args...]');
  console.error('');
  console.error('Runs <command> with NODE_V8_COVERAGE enabled and reports project files');
  console.error('that were never required or imported, e.g.: unnecessary mocha');
}

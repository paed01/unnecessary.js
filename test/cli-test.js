import Path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

import { expect } from 'chai';

describe('cli', () => {
  // node re-injects NODE_V8_COVERAGE into child env when coverage is active,
  // so deleting it is ineffective - override with a throwaway dir to keep cli
  // runs under c8 from polluting the coverage dir this process reads from
  let cliEnv;
  let cliCoverageDir;
  beforeEach(() => {
    cliCoverageDir = mkdtempSync(Path.join(tmpdir(), 'unnecessary-cli-'));
    cliEnv = { ...process.env, NODE_V8_COVERAGE: cliCoverageDir };
  });
  afterEach(() => {
    rmSync(cliCoverageDir, { recursive: true, force: true });
  });

  it('runs command with NODE_V8_COVERAGE and reports untouched files', () => {
    // an inline -e script gets mangled by naive shell argument joining on
    // windows, where the cli spawns through cmd.exe - use a script file
    const scriptFile = Path.join(cliCoverageDir, 'import-arbitrary.mjs');
    writeFileSync(scriptFile, `import ${JSON.stringify(pathToFileURL(Path.resolve('test/data/arbitrary.js')).href)};\n`);

    const stdout = execFileSync(process.execPath, ['bin/cli.js', process.execPath, scriptFile], {
      cwd: Path.resolve('.'),
      env: cliEnv,
      encoding: 'utf8',
    });

    expect(stdout).to.include('potentially unused');
    expect(stdout).to.include('test/data/arbitrary.json');
    expect(stdout).to.not.include('test/data/arbitrary.js');
  }).timeout(5000);

  it('reports files relative to the invoking directory when --cwd points elsewhere', () => {
    const stdout = execFileSync(process.execPath, ['bin/cli.js', '--cwd', 'test', process.execPath, '-e', '1'], {
      cwd: Path.resolve('.'),
      env: cliEnv,
      encoding: 'utf8',
    });

    expect(stdout).to.include('test/data/arbitrary.json');
    expect(stdout).to.not.include('  data/arbitrary.json');
  }).timeout(5000);

  it('exclude options are forwarded and exit code passed through', () => {
    let error;
    try {
      execFileSync(process.execPath, ['bin/cli.js', '--exclude-dir', 'test', '--', process.execPath, '-e', 'process.exit(3);'], {
        cwd: Path.resolve('.'),
        env: cliEnv,
        encoding: 'utf8',
      });
    } catch (err) {
      error = err;
    }

    expect(error, 'expected child to fail').to.be.ok;
    expect(error.status).to.equal(3);
    expect(error.stdout).to.not.include('test/data/arbitrary.json');
  }).timeout(5000);
});

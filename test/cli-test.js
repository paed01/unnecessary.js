import Path from 'node:path';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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

  describe('package.json options', () => {
    const cliFile = Path.resolve('bin/cli.js');
    let projectDir;
    beforeEach(() => {
      // native realpath expands windows short names, like the traversal does
      projectDir = realpathSync.native(mkdtempSync(Path.join(tmpdir(), 'unnecessary-cli-project-')));
      writeFileSync(Path.join(projectDir, 'package.json'), JSON.stringify({ unnecessary: { excludeFiles: ['excluded.js'] } }));
      writeFileSync(Path.join(projectDir, 'excluded.js'), '');
      writeFileSync(Path.join(projectDir, 'unused.js'), '');

      mkdirSync(Path.join(projectDir, 'app'));
      writeFileSync(Path.join(projectDir, 'app', 'package.json'), JSON.stringify({ unnecessary: { excludeFiles: ['unused.js'] } }));
      writeFileSync(Path.join(projectDir, 'app', 'excluded.js'), '');
      writeFileSync(Path.join(projectDir, 'app', 'unused.js'), '');
    });
    afterEach(() => {
      rmSync(projectDir, { recursive: true, force: true });
    });

    it('reads options from the unnecessary field in package.json', () => {
      const stdout = execFileSync(process.execPath, [cliFile, process.execPath, '-e', '1'], {
        cwd: projectDir,
        env: cliEnv,
        encoding: 'utf8',
      });

      expect(stdout).to.include('  unused.js\x1b');
      expect(stdout).to.not.include('  excluded.js\x1b');
    }).timeout(5000);

    it('exclude arguments add to the package.json excludes', () => {
      const args = ['--exclude-dir', 'app', '--exclude-file', 'unused.js', process.execPath, '-e', '1'];
      const stdout = execFileSync(process.execPath, [cliFile, ...args], {
        cwd: projectDir,
        env: cliEnv,
        encoding: 'utf8',
      });

      expect(stdout).to.include('No potentially unused files found');
    }).timeout(5000);

    it('honors cwd from package.json', () => {
      writeFileSync(Path.join(projectDir, 'package.json'), JSON.stringify({ unnecessary: { cwd: 'app', excludeFiles: ['excluded.js'] } }));

      const stdout = execFileSync(process.execPath, [cliFile, process.execPath, '-e', '1'], {
        cwd: projectDir,
        env: cliEnv,
        encoding: 'utf8',
      });

      expect(stdout).to.include('  app/unused.js\x1b');
      expect(stdout).to.not.include('excluded.js');
    }).timeout(5000);

    it('--cwd reads package.json from that directory instead of the invoking directory', () => {
      const stdout = execFileSync(process.execPath, [cliFile, '--cwd', 'app', process.execPath, '-e', '1'], {
        cwd: projectDir,
        env: cliEnv,
        encoding: 'utf8',
      });

      expect(stdout).to.include('  app/excluded.js\x1b');
      expect(stdout).to.not.include('unused.js');
    }).timeout(5000);
  });

  describe('coverage directory', () => {
    const cliFile = Path.resolve('bin/cli.js');
    const v8Report = /^coverage-\d+-\d+-\d+\.json$/;
    let projectDir;
    let coverageDir;
    let uncoveredEnv;
    beforeEach(() => {
      // native realpath expands windows short names, like the traversal does
      projectDir = realpathSync.native(mkdtempSync(Path.join(tmpdir(), 'unnecessary-cli-project-')));
      coverageDir = Path.join(projectDir, 'cov');
      writeFileSync(Path.join(projectDir, 'unused.js'), '');
      // emptied rather than deleted, node re-injects a deleted variable when coverage is active
      uncoveredEnv = { ...cliEnv, NODE_V8_COVERAGE: '' };
    });
    afterEach(() => {
      rmSync(projectDir, { recursive: true, force: true });
    });

    it('--coverage-dir keeps the coverage reports in that directory', () => {
      const stdout = execFileSync(process.execPath, [cliFile, '--coverage-dir', 'cov', process.execPath, '-e', '1'], {
        cwd: projectDir,
        env: cliEnv,
        encoding: 'utf8',
      });

      expect(readdirSync(coverageDir).filter((name) => v8Report.test(name))).to.not.be.empty;
      expect(stdout).to.include('  unused.js\x1b');
      expect(stdout).to.not.include('cov/');
    }).timeout(5000);

    it('--coverage-dir removes reports left by a previous run', () => {
      mkdirSync(coverageDir);
      const staleReport = JSON.stringify({ result: [{ url: Path.join(projectDir, 'unused.js') }] });
      writeFileSync(Path.join(coverageDir, 'coverage-1-1-0.json'), staleReport);
      writeFileSync(Path.join(coverageDir, 'coverage-final.json'), '{}');

      const stdout = execFileSync(process.execPath, [cliFile, '--coverage-dir', 'cov', process.execPath, '-e', '1'], {
        cwd: projectDir,
        env: cliEnv,
        encoding: 'utf8',
      });

      expect(stdout).to.include('  unused.js\x1b');
      expect(readdirSync(coverageDir)).to.include('coverage-final.json').and.not.include('coverage-1-1-0.json');
    }).timeout(5000);

    it('coverageDir in package.json keeps the coverage reports in that directory', () => {
      writeFileSync(Path.join(projectDir, 'package.json'), JSON.stringify({ unnecessary: { coverageDir: 'cov' } }));

      const stdout = execFileSync(process.execPath, [cliFile, process.execPath, '-e', '1'], {
        cwd: projectDir,
        env: uncoveredEnv,
        encoding: 'utf8',
      });

      expect(readdirSync(coverageDir).filter((name) => v8Report.test(name))).to.not.be.empty;
      expect(stdout).to.include('  unused.js\x1b');
      expect(stdout).to.not.include('cov/');
    }).timeout(5000);

    it('coverageDir in package.json is relative to the --cwd directory', () => {
      const appDir = Path.join(projectDir, 'app');
      mkdirSync(appDir);
      writeFileSync(Path.join(appDir, 'package.json'), JSON.stringify({ unnecessary: { coverageDir: 'cov' } }));

      execFileSync(process.execPath, [cliFile, '--cwd', 'app', process.execPath, '-e', '1'], {
        cwd: projectDir,
        env: uncoveredEnv,
        encoding: 'utf8',
      });

      expect(readdirSync(Path.join(appDir, 'cov')).filter((name) => v8Report.test(name))).to.not.be.empty;
      expect(existsSync(coverageDir)).to.be.false;
    }).timeout(5000);

    it('inherited NODE_V8_COVERAGE takes precedence over coverageDir in package.json', () => {
      writeFileSync(Path.join(projectDir, 'package.json'), JSON.stringify({ unnecessary: { coverageDir: 'cov' } }));

      execFileSync(process.execPath, [cliFile, process.execPath, '-e', '1'], {
        cwd: projectDir,
        env: cliEnv,
        encoding: 'utf8',
      });

      expect(existsSync(coverageDir)).to.be.false;
      expect(readdirSync(cliCoverageDir).filter((name) => v8Report.test(name))).to.not.be.empty;
    }).timeout(5000);
  });
});

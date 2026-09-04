import Path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';

import { expect } from 'chai';

import nodeTestReporter from 'unnecessary/node-test';

describe('node:test reporter', () => {
  it('drains the event stream, awaits traversal and reports untouched files', async () => {
    const source = Readable.from([{ type: 'test:start' }, { type: 'test:pass' }]);

    const chunks = [];
    for await (const chunk of nodeTestReporter(source)) chunks.push(chunk);

    const output = chunks.join('');
    expect(output).to.include('potentially unused');
    expect(output).to.include('test/data/arbitrary.json');
    // options are picked up from the package.json unnecessary field
    expect(output).to.not.include('rollup.config.js');
  });

  describe('as custom reporter in an actual node:test run', () => {
    let coverageDir;
    beforeEach(() => {
      // override NODE_V8_COVERAGE with a throwaway dir so a run under c8 does not
      // pollute the coverage dir this process reads from
      coverageDir = mkdtempSync(Path.join(tmpdir(), 'unnecessary-node-test-'));
    });
    afterEach(() => {
      rmSync(coverageDir, { recursive: true, force: true });
    });

    const run = (...args) =>
      execFileSync(process.execPath, ['--test-reporter', './dist/node-test.cjs', ...args, 'test/data/node-test-script.cjs'], {
        cwd: Path.resolve('.'),
        env: { ...process.env, NODE_V8_COVERAGE: coverageDir },
        encoding: 'utf8',
      });

    it('in-process run detects required files through the require cache', () => {
      const stdout = run();

      expect(stdout).to.include('potentially unused');
      expect(stdout).to.include('test/data/arbitrary.js');
      expect(stdout).to.include('test/data/arbitrary.json');
      expect(stdout).to.not.include('test/data/arbitrary.cjs');
    }).timeout(10000);

    it('--test run detects files loaded by the child process through coverage', () => {
      const stdout = run('--test');

      expect(stdout).to.include('potentially unused');
      expect(stdout).to.include('test/data/arbitrary.js');
      expect(stdout).to.include('test/data/arbitrary.json');
      expect(stdout).to.not.include('test/data/arbitrary.cjs');
    }).timeout(10000);
  });
});

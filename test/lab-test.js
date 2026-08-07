import Path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { expect } from 'chai';

import LabReporter from 'unnecessary/lab';

describe('lab reporter', () => {
  it('implements the lab reporter interface', () => {
    const reporter = new LabReporter({});
    expect(reporter.start).to.be.a('function');
    expect(reporter.test).to.be.a('function');
    expect(reporter.end).to.be.a('function');
  });

  it('end awaits traversal and reports untouched files', async () => {
    const reporter = new LabReporter({});

    const chunks = [];
    reporter.report = (text) => chunks.push(text);
    reporter.start();
    reporter.test();
    await reporter.end();

    const output = chunks.join('');
    expect(output).to.include('potentially unused');
    expect(output).to.include('test/data/arbitrary.json');
    // options are picked up from the package.json unnecessary field
    expect(output).to.not.include('rollup.config.js');
  });

  it('runs as custom reporter in an actual lab run', () => {
    // override NODE_V8_COVERAGE with a throwaway dir so a run under c8 does not
    // pollute the coverage dir this process reads from
    const coverageDir = mkdtempSync(Path.join(tmpdir(), 'unnecessary-lab-'));
    try {
      // the real js bin, not the node_modules/.bin shim - on windows that
      // extensionless shim is a shell script node cannot execute
      const stdout = execFileSync(
        process.execPath,
        ['node_modules/@hapi/lab/bin/lab', 'test/data/lab-script.cjs', '-r', './dist/lab.cjs'],
        {
          cwd: Path.resolve('.'),
          env: { ...process.env, NODE_V8_COVERAGE: coverageDir },
          encoding: 'utf8',
        },
      );

      expect(stdout).to.include('potentially unused');
      expect(stdout).to.include('test/data/arbitrary.json');
    } finally {
      rmSync(coverageDir, { recursive: true, force: true });
    }
  }).timeout(10000);
});
